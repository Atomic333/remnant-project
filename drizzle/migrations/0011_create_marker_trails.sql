CREATE TABLE public.trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_path text,
  city text NOT NULL DEFAULT 'Tacoma',
  theme text NOT NULL DEFAULT 'Community stories',
  accessibility text,
  terrain text,
  is_loop boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  current_revision_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trails TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trails TO authenticated;
GRANT ALL ON public.trails TO service_role;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published trails are public" ON public.trails FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert trails" ON public.trails FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update trails" ON public.trails FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete trails" ON public.trails FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trails_set_updated_at BEFORE UPDATE ON public.trails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trail_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  marker_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  UNIQUE (trail_id, marker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trail_stops TO authenticated;
GRANT ALL ON public.trail_stops TO service_role;
ALTER TABLE public.trail_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage draft stops" ON public.trail_stops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.trail_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  version integer NOT NULL,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  legs jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_m integer NOT NULL DEFAULT 0,
  duration_s integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trail_id, version)
);
GRANT SELECT ON public.trail_revisions TO anon, authenticated;
GRANT ALL ON public.trail_revisions TO service_role;
ALTER TABLE public.trail_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published revisions are public" ON public.trail_revisions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.trail_route_cache (
  key text PRIMARY KEY,
  polyline text NOT NULL,
  distance_m integer NOT NULL,
  duration_s integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.trail_route_cache TO service_role;
ALTER TABLE public.trail_route_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trail_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trail_id uuid NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES public.trail_revisions(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','exited')),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX trail_sessions_one_open ON public.trail_sessions (user_id, trail_id) WHERE status IN ('active','paused');
GRANT SELECT ON public.trail_sessions TO authenticated;
GRANT ALL ON public.trail_sessions TO service_role;
ALTER TABLE public.trail_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own trail sessions" ON public.trail_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.trail_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.trail_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  marker_id text NOT NULL,
  method text NOT NULL CHECK (method IN ('qr','manual')),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, marker_id)
);
GRANT SELECT ON public.trail_checkins TO authenticated;
GRANT ALL ON public.trail_checkins TO service_role;
ALTER TABLE public.trail_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own trail checkins" ON public.trail_checkins FOR SELECT TO authenticated USING (user_id = auth.uid());