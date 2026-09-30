CREATE TABLE public.h5p_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_slug text NOT NULL,
  title text NOT NULL,
  library text,
  storage_prefix text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 10 CHECK (reward_amount >= 0 AND reward_amount <= 500),
  min_seconds integer NOT NULL DEFAULT 20 CHECK (min_seconds >= 0 AND min_seconds <= 3600),
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX h5p_activities_marker ON public.h5p_activities (marker_slug, position);
GRANT SELECT ON public.h5p_activities TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.h5p_activities TO authenticated;
GRANT ALL ON public.h5p_activities TO service_role;
ALTER TABLE public.h5p_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published activities are public" ON public.h5p_activities FOR SELECT TO anon, authenticated
  USING (published OR public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers update activities" ON public.h5p_activities FOR UPDATE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug)) WITH CHECK (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers delete activities" ON public.h5p_activities FOR DELETE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));
CREATE TRIGGER h5p_activities_set_updated_at BEFORE UPDATE ON public.h5p_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.h5p_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL REFERENCES public.h5p_activities(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours',
  completed_at timestamptz,
  raw_result jsonb
);
CREATE INDEX h5p_attempts_user ON public.h5p_attempts (user_id, activity_id);
GRANT ALL ON public.h5p_attempts TO service_role;
ALTER TABLE public.h5p_attempts ENABLE ROW LEVEL SECURITY;