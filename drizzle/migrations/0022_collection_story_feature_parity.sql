ALTER TABLE public.collection_markers
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS artifact_model_url text,
  ADD COLUMN IF NOT EXISTS artifact_name text,
  ADD COLUMN IF NOT EXISTS artifact_attribution text,
  ADD COLUMN IF NOT EXISTS street_view jsonb,
  ADD COLUMN IF NOT EXISTS discovery_visibility text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS reveal_style text NOT NULL DEFAULT 'postcard_flip',
  ADD COLUMN IF NOT EXISTS arrival_radius_m integer NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS available_from timestamptz,
  ADD COLUMN IF NOT EXISTS available_until timestamptz,
  ADD COLUMN IF NOT EXISTS availability_tz text NOT NULL DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS clue text;

CREATE OR REPLACE FUNCTION public.can_manage_marker(_user_id uuid, _slug text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;
  IF NOT public.is_creator(_user_id) THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.markers WHERE slug = _slug AND created_by = _user_id)
    OR EXISTS (SELECT 1 FROM public.collection_markers WHERE marker_id = _slug);
END; $$;