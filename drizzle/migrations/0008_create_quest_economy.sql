-- ============ QUEST rewards economy ============

-- Marker rarity (additive, defaulted)
ALTER TABLE public.markers ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common';

-- ---------- Append-only ledger ----------
CREATE TABLE public.reward_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  quest_amount INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- blockchain-ready (unused for now)
  wallet_address TEXT,
  chain_id TEXT,
  chain_tx_hash TEXT,
  settlement_status TEXT NOT NULL DEFAULT 'off_chain',
  settled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX reward_events_idempotency
  ON public.reward_events (user_id, event_type, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX reward_events_user_created ON public.reward_events (user_id, created_at DESC);

GRANT SELECT ON public.reward_events TO authenticated;
GRANT ALL ON public.reward_events TO service_role;
ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reward events"
  ON public.reward_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- Derived balance cache ----------
CREATE TABLE public.explorer_balances (
  user_id UUID PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 0,
  lifetime_earned BIGINT NOT NULL DEFAULT 0,
  lifetime_spent BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.explorer_balances TO authenticated;
GRANT ALL ON public.explorer_balances TO service_role;
ALTER TABLE public.explorer_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own balance"
  ON public.explorer_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.apply_reward_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.explorer_balances (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
  VALUES (
    NEW.user_id,
    NEW.quest_amount,
    GREATEST(NEW.quest_amount, 0),
    GREATEST(-NEW.quest_amount, 0),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.explorer_balances.balance + NEW.quest_amount,
    lifetime_earned = public.explorer_balances.lifetime_earned + GREATEST(NEW.quest_amount, 0),
    lifetime_spent = public.explorer_balances.lifetime_spent + GREATEST(-NEW.quest_amount, 0),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reward_events_apply_balance
AFTER INSERT ON public.reward_events
FOR EACH ROW EXECUTE FUNCTION public.apply_reward_event();

-- ---------- Completions (trivia, trails) ----------
CREATE TABLE public.quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  completion_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, completion_type, target_id)
);

GRANT SELECT ON public.quest_completions TO authenticated;
GRANT ALL ON public.quest_completions TO service_role;
ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own completions"
  ON public.quest_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- Achievements ----------
CREATE TABLE public.achievements (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'award',
  tier TEXT NOT NULL DEFAULT 'bronze',
  quest_reward INTEGER NOT NULL DEFAULT 25,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT TO anon, authenticated
  USING (active);
CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_code TEXT NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_code)
);

GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- Rewards catalog + redemptions ----------
CREATE TABLE public.rewards_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'cosmetic',
  cost INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'gift',
  unlock_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  partner_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

GRANT SELECT ON public.rewards_catalog TO anon, authenticated;
GRANT ALL ON public.rewards_catalog TO service_role;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards catalog is viewable by everyone"
  ON public.rewards_catalog FOR SELECT TO anon, authenticated
  USING (active);
CREATE POLICY "Admins can manage rewards catalog"
  ON public.rewards_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_code TEXT NOT NULL REFERENCES public.rewards_catalog(code) ON DELETE RESTRICT,
  quest_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued',
  redemption_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.redemptions TO authenticated;
GRANT ALL ON public.redemptions TO service_role;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own redemptions"
  ON public.redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can view all redemptions"
  ON public.redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- Cached AI trivia (answers are service_role only) ----------
CREATE TABLE public.marker_trivia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_id TEXT NOT NULL UNIQUE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.marker_trivia TO service_role;
ALTER TABLE public.marker_trivia ENABLE ROW LEVEL SECURITY;

-- ---------- Scan proof nonces (server only) ----------
CREATE TABLE public.scan_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  marker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ
);

GRANT ALL ON public.scan_tokens TO service_role;
ALTER TABLE public.scan_tokens ENABLE ROW LEVEL SECURITY;