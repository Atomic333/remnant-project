CREATE OR REPLACE FUNCTION public.can_edit_collections(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.is_creator(_user_id)
$$;

CREATE TABLE public.collections (
  code text PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collection_markers (
  marker_id text PRIMARY KEY,
  collection_code text NOT NULL REFERENCES public.collections(code) ON DELETE CASCADE,
  title text NOT NULL,
  history_focus text,
  community text,
  city_name text,
  county text,
  region_label text,
  region text,
  city_id text,
  address text,
  lat double precision,
  lng double precision,
  coord_withheld boolean NOT NULL DEFAULT false,
  coord_precision text,
  location_relationship text,
  period text,
  summary text,
  story text,
  why_it_matters text,
  visitor_connection text,
  access_notes text,
  review_status text,
  plaque_status text,
  narrative_kind text NOT NULL DEFAULT 'research',
  marker_type text,
  sensitive boolean NOT NULL DEFAULT false,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  featured_article text,
  draft_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  import_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collection_markers_code ON public.collection_markers (collection_code);

CREATE TABLE public.collection_sources (
  source_key text PRIMARY KEY,
  marker_id text NOT NULL REFERENCES public.collection_markers(marker_id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  author text,
  publisher text,
  pub_date text,
  url text,
  access_date text,
  source_type text,
  archival_ref text,
  supports text,
  checked boolean NOT NULL DEFAULT false,
  import_hash text
);
CREATE INDEX collection_sources_marker ON public.collection_sources (marker_id);

CREATE TABLE public.collection_images (
  image_key text PRIMARY KEY,
  marker_id text NOT NULL REFERENCES public.collection_markers(marker_id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  kind text,
  title text,
  description text,
  creator text,
  image_date text,
  rights_holder text,
  record_url text,
  image_url text,
  license text,
  attribution text,
  cleared boolean NOT NULL DEFAULT false,
  reuse_status text,
  caption text,
  alt text,
  notes text,
  import_hash text
);
CREATE INDEX collection_images_marker ON public.collection_images (marker_id);

CREATE TABLE public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_code text,
  created_by uuid,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.import_issues (
  issue_key text PRIMARY KEY,
  run_id uuid REFERENCES public.import_runs(id) ON DELETE SET NULL,
  collection_code text,
  marker_id text,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'review',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collections, public.collection_markers, public.collection_sources, public.collection_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections, public.collection_markers, public.collection_sources, public.collection_images, public.import_runs, public.import_issues TO authenticated;
GRANT ALL ON public.collections, public.collection_markers, public.collection_sources, public.collection_images, public.import_runs, public.import_issues TO service_role;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors manage collections" ON public.collections FOR ALL TO authenticated
  USING (public.can_edit_collections(auth.uid())) WITH CHECK (public.can_edit_collections(auth.uid()));
CREATE POLICY "Published collections are public" ON public.collections FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE POLICY "Editors manage collection markers" ON public.collection_markers FOR ALL TO authenticated
  USING (public.can_edit_collections(auth.uid())) WITH CHECK (public.can_edit_collections(auth.uid()));
CREATE POLICY "Published collection markers are public" ON public.collection_markers FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE POLICY "Editors manage collection sources" ON public.collection_sources FOR ALL TO authenticated
  USING (public.can_edit_collections(auth.uid())) WITH CHECK (public.can_edit_collections(auth.uid()));
CREATE POLICY "Sources of published markers are public" ON public.collection_sources FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.collection_markers m WHERE m.marker_id = collection_sources.marker_id AND m.status = 'published'));

CREATE POLICY "Editors manage collection images" ON public.collection_images FOR ALL TO authenticated
  USING (public.can_edit_collections(auth.uid())) WITH CHECK (public.can_edit_collections(auth.uid()));
CREATE POLICY "Cleared images of published markers are public" ON public.collection_images FOR SELECT TO anon, authenticated
  USING (cleared AND EXISTS (SELECT 1 FROM public.collection_markers m WHERE m.marker_id = collection_images.marker_id AND m.status = 'published'));

CREATE POLICY "Editors manage import runs" ON public.import_runs FOR ALL TO authenticated
  USING (public.can_edit_collections(auth.uid())) WITH CHECK (public.can_edit_collections(auth.uid()));
CREATE POLICY "Editors manage import issues" ON public.import_issues FOR ALL TO authenticated
  USING (public.can_edit_collections(auth.uid())) WITH CHECK (public.can_edit_collections(auth.uid()));

CREATE TRIGGER collection_markers_set_updated_at BEFORE UPDATE ON public.collection_markers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER import_issues_set_updated_at BEFORE UPDATE ON public.import_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER collections_set_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();