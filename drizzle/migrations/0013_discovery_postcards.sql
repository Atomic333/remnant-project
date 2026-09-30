ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';

ALTER TABLE public.markers
  ADD COLUMN IF NOT EXISTS marker_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS discovery_visibility text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS reveal_style text NOT NULL DEFAULT 'postcard_flip',
  ADD COLUMN IF NOT EXISTS sensitivity text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS arrival_radius_m integer NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS available_from timestamptz,
  ADD COLUMN IF NOT EXISTS available_until timestamptz,
  ADD COLUMN IF NOT EXISTS availability_tz text NOT NULL DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS clue text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';

-- Role helpers written in plpgsql so the new enum value is only resolved at run time.
CREATE OR REPLACE FUNCTION public.is_creator(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'creator');
END; $$;

CREATE OR REPLACE FUNCTION public.can_manage_marker(_user_id uuid, _slug text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;
  RETURN public.is_creator(_user_id) AND EXISTS (
    SELECT 1 FROM public.markers WHERE slug = _slug AND created_by = _user_id);
END; $$;

-- Unlisted discoveries are hidden from the public marker list; the server reveals them once eligible.
DROP POLICY IF EXISTS "Published markers are viewable by everyone" ON public.markers;
CREATE POLICY "Published markers are viewable by everyone" ON public.markers FOR SELECT TO anon, authenticated
  USING ((published AND discovery_visibility <> 'unlisted') OR public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
CREATE POLICY "Creators can insert own markers" ON public.markers FOR INSERT TO authenticated
  WITH CHECK (public.is_creator(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Creators can update own markers" ON public.markers FOR UPDATE TO authenticated
  USING (public.is_creator(auth.uid()) AND created_by = auth.uid())
  WITH CHECK (public.is_creator(auth.uid()) AND created_by = auth.uid());

-- Secret, unlockable content. Never publicly readable.
CREATE TABLE public.discovery_content (
  marker_slug text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  bonus_story text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_path text,
  reflection_prompt text,
  reward_kind text NOT NULL DEFAULT 'postcard',
  reward_quest integer NOT NULL DEFAULT 0,
  reward_badge_code text,
  reward_scope text NOT NULL DEFAULT 'marker',
  campaign_code text,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_content TO authenticated;
GRANT ALL ON public.discovery_content TO service_role;
ALTER TABLE public.discovery_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read discovery content" ON public.discovery_content FOR SELECT TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers insert discovery content" ON public.discovery_content FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers update discovery content" ON public.discovery_content FOR UPDATE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug)) WITH CHECK (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers delete discovery content" ON public.discovery_content FOR DELETE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));

CREATE TABLE public.discovery_prerequisites (
  marker_slug text NOT NULL,
  requires_type text NOT NULL CHECK (requires_type IN ('marker','trail')),
  requires_id text NOT NULL,
  PRIMARY KEY (marker_slug, requires_type, requires_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_prerequisites TO authenticated;
GRANT ALL ON public.discovery_prerequisites TO service_role;
ALTER TABLE public.discovery_prerequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read prerequisites" ON public.discovery_prerequisites FOR SELECT TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers insert prerequisites" ON public.discovery_prerequisites FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers delete prerequisites" ON public.discovery_prerequisites FOR DELETE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));

CREATE TABLE public.postcard_sets (
  code text PRIMARY KEY,
  name text NOT NULL,
  city text,
  trail_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.postcard_sets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postcard_sets TO authenticated;
GRANT ALL ON public.postcard_sets TO service_role;
ALTER TABLE public.postcard_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Postcard sets are public" ON public.postcard_sets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Managers insert sets" ON public.postcard_sets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (public.is_creator(auth.uid()) AND created_by = auth.uid()));
CREATE POLICY "Managers update sets" ON public.postcard_sets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY "Managers delete sets" ON public.postcard_sets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());

-- Postcards: read only by managers directly; visitors get sanitised data via the discovery function.
CREATE TABLE public.postcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_slug text NOT NULL UNIQUE,
  set_code text REFERENCES public.postcard_sets(code) ON DELETE SET NULL,
  title text NOT NULL,
  location text NOT NULL DEFAULT '',
  front_path text,
  front_alt text NOT NULL DEFAULT '',
  back_text text NOT NULL DEFAULT '',
  credits text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret_title boolean NOT NULL DEFAULT false,
  commemorative boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postcards TO authenticated;
GRANT ALL ON public.postcards TO service_role;
ALTER TABLE public.postcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read postcards" ON public.postcards FOR SELECT TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers insert postcards" ON public.postcards FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers update postcards" ON public.postcards FOR UPDATE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug)) WITH CHECK (public.can_manage_marker(auth.uid(), marker_slug));
CREATE POLICY "Managers delete postcards" ON public.postcards FOR DELETE TO authenticated
  USING (public.can_manage_marker(auth.uid(), marker_slug));
CREATE TRIGGER postcards_set_updated_at BEFORE UPDATE ON public.postcards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Verified or pending claims. Written only by the discovery function.
CREATE TABLE public.discovery_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  marker_slug text NOT NULL,
  method text NOT NULL CHECK (method IN ('qr','gps')),
  status text NOT NULL DEFAULT 'verified' CHECK (status IN ('verified','pending','claimed')),
  guest_secret uuid,
  verified_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  expires_at timestamptz
);
CREATE UNIQUE INDEX discovery_claims_user_marker ON public.discovery_claims (user_id, marker_slug) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX discovery_claims_guest_secret ON public.discovery_claims (guest_secret) WHERE guest_secret IS NOT NULL;
GRANT SELECT ON public.discovery_claims TO authenticated;
GRANT ALL ON public.discovery_claims TO service_role;
ALTER TABLE public.discovery_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own claims" ON public.discovery_claims FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.user_postcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  postcard_id uuid NOT NULL REFERENCES public.postcards(id) ON DELETE CASCADE,
  collected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, postcard_id)
);
GRANT SELECT ON public.user_postcards TO authenticated;
GRANT ALL ON public.user_postcards TO service_role;
ALTER TABLE public.user_postcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own postcards" ON public.user_postcards FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Private artwork/audio bucket policies (bucket created separately).
CREATE POLICY "Managers upload postcard art" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'postcard-art' AND (public.has_role(auth.uid(),'admin') OR public.is_creator(auth.uid())));
CREATE POLICY "Managers update postcard art" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'postcard-art' AND (public.has_role(auth.uid(),'admin') OR owner = auth.uid()));
CREATE POLICY "Managers read postcard art" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'postcard-art' AND (public.has_role(auth.uid(),'admin') OR owner = auth.uid()));