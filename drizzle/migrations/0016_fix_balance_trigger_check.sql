CREATE OR REPLACE FUNCTION public.apply_reward_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE earned int := 0; spent int := 0;
BEGIN
  IF NEW.event_type = 'refund' THEN spent := -NEW.quest_amount;
  ELSE earned := GREATEST(NEW.quest_amount, 0); spent := GREATEST(-NEW.quest_amount, 0);
  END IF;
  -- Insert a zero row first: CHECK (balance >= 0) is evaluated on the proposed insert row.
  INSERT INTO public.explorer_balances (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.explorer_balances SET
    balance = balance + NEW.quest_amount,
    lifetime_earned = lifetime_earned + earned,
    lifetime_spent = GREATEST(lifetime_spent + spent, 0),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END; $$;