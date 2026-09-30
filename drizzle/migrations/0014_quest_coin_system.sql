-- Reward rules (editable amounts/eligibility)
CREATE TABLE public.reward_rules (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 5000),
  repeatable boolean NOT NULL DEFAULT false,
  cooldown_hours integer NOT NULL DEFAULT 0 CHECK (cooldown_hours >= 0),
  cap_per_user integer CHECK (cap_per_user IS NULL OR cap_per_user > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  verification text NOT NULL DEFAULT 'scan',
  stacks_with_trail boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_rules TO anon, authenticated;
GRANT ALL ON public.reward_rules TO service_role;
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active rules" ON public.reward_rules FOR SELECT USING (active = true);

-- Campaigns with coin budgets
CREATE TABLE public.campaigns (
  code text PRIMARY KEY,
  name text NOT NULL,
  budget integer CHECK (budget IS NULL OR budget >= 0),
  spent integer NOT NULL DEFAULT 0 CHECK (spent >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_within_budget CHECK (budget IS NULL OR spent <= budget)
);
GRANT SELECT ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read campaigns" ON public.campaigns FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- Special event quests (check-in secret never exposed)
CREATE TABLE public.quest_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text,
  amount integer CHECK (amount IS NULL OR (amount >= 0 AND amount <= 5000)),
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  verification text NOT NULL DEFAULT 'rotating_code',
  checkin_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  rotate_seconds integer NOT NULL DEFAULT 60 CHECK (rotate_seconds BETWEEN 15 AND 3600),
  campaign_code text REFERENCES public.campaigns(code),
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, code, name, description, location, amount, starts_at, ends_at, timezone, verification, published, created_at) ON public.quest_events TO anon, authenticated;
GRANT ALL ON public.quest_events TO service_role;
ALTER TABLE public.quest_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published events" ON public.quest_events FOR SELECT USING (published = true);

-- Store columns on the existing catalog
ALTER TABLE public.rewards_catalog
  ADD COLUMN item_type text NOT NULL DEFAULT 'collectible',
  ADD COLUMN preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN published boolean NOT NULL DEFAULT true,
  ADD COLUMN inventory integer CHECK (inventory IS NULL OR inventory >= 0),
  ADD COLUMN sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN sponsor_url text,
  ADD COLUMN redemption_instructions text,
  ADD COLUMN code_expires_days integer,
  ADD CONSTRAINT rewards_not_oversold CHECK (inventory IS NULL OR sold <= inventory);

-- Redemption lifecycle
ALTER TABLE public.redemptions
  ADD COLUMN idempotency_key text,
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN redeemed_at timestamptz,
  ADD COLUMN refunded_at timestamptz,
  ADD COLUMN refund_reason text;
CREATE UNIQUE INDEX redemptions_idem ON public.redemptions (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Single-use partner codes (admin-only)
CREATE TABLE public.partner_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_code text NOT NULL REFERENCES public.rewards_catalog(code),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available',
  redemption_id uuid REFERENCES public.redemptions(id),
  assigned_to uuid,
  redeemed_at timestamptz,
  redeemed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_codes TO service_role;
ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;

-- Digital entitlements
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_code text NOT NULL REFERENCES public.rewards_catalog(code),
  redemption_id uuid REFERENCES public.redemptions(id),
  equipped boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_code)
);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own entitlements" ON public.entitlements FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Audit + review flags
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_flags TO authenticated;
GRANT ALL ON public.review_flags TO service_role;
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read flags" ON public.review_flags FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Contributions
ALTER TABLE public.marker_requests
  ADD COLUMN submitted_by uuid,
  ADD COLUMN reviewed_at timestamptz;

-- Ledger hardening
ALTER TABLE public.reward_events
  ADD COLUMN award_key text,
  ADD COLUMN status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN reverses_event_id uuid REFERENCES public.reward_events(id);
CREATE UNIQUE INDEX reward_events_award_key ON public.reward_events (award_key) WHERE award_key IS NOT NULL;
COMMENT ON COLUMN public.reward_events.wallet_address IS 'DEPRECATED: Quest Coin is off-chain; no blockchain.';
COMMENT ON COLUMN public.reward_events.chain_id IS 'DEPRECATED: Quest Coin is off-chain; no blockchain.';
COMMENT ON COLUMN public.reward_events.chain_tx_hash IS 'DEPRECATED: Quest Coin is off-chain; no blockchain.';
COMMENT ON COLUMN public.reward_events.settled_at IS 'DEPRECATED: Quest Coin is off-chain; no blockchain.';
ALTER TABLE public.explorer_balances ADD CONSTRAINT balance_nonnegative CHECK (balance >= 0);

-- Refunds reduce "spent", never inflate lifetime earnings
CREATE OR REPLACE FUNCTION public.apply_reward_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE earned int := 0; spent int := 0;
BEGIN
  IF NEW.event_type = 'refund' THEN spent := -NEW.quest_amount;
  ELSE earned := GREATEST(NEW.quest_amount, 0); spent := GREATEST(-NEW.quest_amount, 0);
  END IF;
  INSERT INTO public.explorer_balances (user_id, balance, lifetime_earned, lifetime_spent, updated_at)
  VALUES (NEW.user_id, NEW.quest_amount, earned, GREATEST(spent,0), now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = public.explorer_balances.balance + NEW.quest_amount,
    lifetime_earned = public.explorer_balances.lifetime_earned + earned,
    lifetime_spent = GREATEST(public.explorer_balances.lifetime_spent + spent, 0),
    updated_at = now();
  RETURN NEW;
END; $$;

-- Atomic purchase: lock wallet + item, check, debit, reserve, issue
CREATE OR REPLACE FUNCTION public.purchase_item(_user uuid, _code text, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE item public.rewards_catalog%ROWTYPE; bal bigint; red_id uuid; pcode text; existing public.redemptions%ROWTYPE;
BEGIN
  SELECT * INTO existing FROM public.redemptions WHERE user_id = _user AND idempotency_key = _key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true, 'redemption_id', existing.id, 'redemption_code', existing.redemption_code);
  END IF;

  INSERT INTO public.explorer_balances (user_id) VALUES (_user) ON CONFLICT DO NOTHING;
  SELECT balance INTO bal FROM public.explorer_balances WHERE user_id = _user FOR UPDATE;
  SELECT * INTO item FROM public.rewards_catalog WHERE code = _code FOR UPDATE;
  IF NOT FOUND OR NOT item.active OR NOT item.published THEN RETURN jsonb_build_object('ok', false, 'error', 'This reward isn''t available.'); END IF;
  IF item.starts_at IS NOT NULL AND now() < item.starts_at THEN RETURN jsonb_build_object('ok', false, 'error', 'This reward isn''t available yet.'); END IF;
  IF item.ends_at IS NOT NULL AND now() > item.ends_at THEN RETURN jsonb_build_object('ok', false, 'error', 'This reward has ended.'); END IF;
  IF item.item_type <> 'partner' AND EXISTS (SELECT 1 FROM public.entitlements WHERE user_id = _user AND reward_code = _code AND revoked_at IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already own this.');
  END IF;
  IF item.inventory IS NOT NULL AND item.sold >= item.inventory THEN RETURN jsonb_build_object('ok', false, 'error', 'Sold out.'); END IF;
  IF bal < item.cost THEN RETURN jsonb_build_object('ok', false, 'error', 'Not enough Quest Coins.', 'short', item.cost - bal); END IF;

  IF item.item_type = 'partner' THEN
    SELECT code INTO pcode FROM public.partner_codes WHERE reward_code = _code AND status = 'available' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF pcode IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Sold out.'); END IF;
  END IF;

  INSERT INTO public.redemptions (user_id, reward_code, quest_spent, status, redemption_code, idempotency_key, expires_at)
  VALUES (_user, _code, item.cost, CASE WHEN item.item_type = 'partner' THEN 'issued' ELSE 'owned' END, pcode, _key,
          CASE WHEN item.code_expires_days IS NOT NULL THEN now() + make_interval(days => item.code_expires_days) END)
  RETURNING id INTO red_id;

  IF pcode IS NOT NULL THEN
    UPDATE public.partner_codes SET status = 'assigned', redemption_id = red_id, assigned_to = _user WHERE code = pcode;
  ELSE
    INSERT INTO public.entitlements (user_id, reward_code, redemption_id) VALUES (_user, _code, red_id)
    ON CONFLICT (user_id, reward_code) DO UPDATE SET revoked_at = NULL, redemption_id = red_id;
  END IF;

  UPDATE public.rewards_catalog SET sold = sold + 1 WHERE code = _code;
  IF item.cost > 0 THEN
    INSERT INTO public.reward_events (user_id, event_type, source_type, source_id, quest_amount, title, metadata, award_key)
    VALUES (_user, 'purchase', 'redemption', red_id::text, -item.cost, 'Bought ' || item.name, jsonb_build_object('reward_code', _code), 'purchase:' || red_id);
  END IF;
  RETURN jsonb_build_object('ok', true, 'redemption_id', red_id, 'redemption_code', pcode);
END; $$;

-- Refund once via compensating entry
CREATE OR REPLACE FUNCTION public.refund_redemption(_actor uuid, _redemption uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.redemptions%ROWTYPE; orig uuid;
BEGIN
  IF coalesce(trim(_reason), '') = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'A reason is required.'); END IF;
  SELECT * INTO r FROM public.redemptions WHERE id = _redemption FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Not found.'); END IF;
  IF r.refunded_at IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'replayed', true); END IF;
  IF r.redeemed_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Already used at a partner.'); END IF;
  SELECT id INTO orig FROM public.reward_events WHERE award_key = 'purchase:' || r.id;
  UPDATE public.redemptions SET refunded_at = now(), refund_reason = _reason, status = 'refunded' WHERE id = r.id;
  UPDATE public.entitlements SET revoked_at = now(), equipped = false WHERE redemption_id = r.id;
  UPDATE public.partner_codes SET status = 'void' WHERE redemption_id = r.id;
  UPDATE public.rewards_catalog SET sold = GREATEST(sold - 1, 0) WHERE code = r.reward_code;
  IF r.quest_spent > 0 THEN
    INSERT INTO public.reward_events (user_id, event_type, source_type, source_id, quest_amount, title, metadata, award_key, reverses_event_id)
    VALUES (r.user_id, 'refund', 'redemption', r.id::text, r.quest_spent, 'Refund', jsonb_build_object('reason', _reason), 'refund:' || r.id, orig);
    UPDATE public.reward_events SET status = 'reversed' WHERE id = orig;
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, reason) VALUES (_actor, 'refund', 'redemption', r.id::text, _reason);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Admin adjustment (idempotent by key)
CREATE OR REPLACE FUNCTION public.admin_adjust(_actor uuid, _user uuid, _amount integer, _reason text, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE bal bigint;
BEGIN
  IF coalesce(trim(_reason), '') = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'A reason is required.'); END IF;
  IF _amount = 0 OR abs(_amount) > 10000 THEN RETURN jsonb_build_object('ok', false, 'error', 'Amount must be between -10000 and 10000, not 0.'); END IF;
  IF EXISTS (SELECT 1 FROM public.reward_events WHERE award_key = 'adjust:' || _key) THEN RETURN jsonb_build_object('ok', true, 'replayed', true); END IF;
  INSERT INTO public.explorer_balances (user_id) VALUES (_user) ON CONFLICT DO NOTHING;
  SELECT balance INTO bal FROM public.explorer_balances WHERE user_id = _user FOR UPDATE;
  IF bal + _amount < 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'That would make the balance negative.'); END IF;
  INSERT INTO public.reward_events (user_id, event_type, source_type, source_id, quest_amount, title, metadata, award_key)
  VALUES (_user, 'adjustment', 'admin', _key, _amount, 'Balance adjustment', jsonb_build_object('reason', _reason), 'adjust:' || _key);
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, reason, details)
  VALUES (_actor, 'adjust', 'user', _user::text, _reason, jsonb_build_object('amount', _amount));
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.purchase_item(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_redemption(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_adjust(uuid, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_redemption(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust(uuid, uuid, integer, text, text) TO service_role;

-- Campaign budget spend (atomic)
CREATE OR REPLACE FUNCTION public.spend_campaign_budget(_code text, _amount integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.campaigns SET spent = spent + _amount
  WHERE code = _code AND active AND (budget IS NULL OR spent + _amount <= budget)
    AND (starts_at IS NULL OR now() >= starts_at) AND (ends_at IS NULL OR now() <= ends_at);
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.spend_campaign_budget(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_campaign_budget(text, integer) TO service_role;