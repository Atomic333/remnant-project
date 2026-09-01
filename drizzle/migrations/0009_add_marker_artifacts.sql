ALTER TABLE public.markers
  ADD COLUMN IF NOT EXISTS artifact_model_url TEXT,
  ADD COLUMN IF NOT EXISTS artifact_name TEXT,
  ADD COLUMN IF NOT EXISTS artifact_attribution TEXT;

DROP POLICY IF EXISTS "Admins can upload marker models" ON storage.objects;
CREATE POLICY "Admins can upload marker models"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marker-models' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update marker models" ON storage.objects;
CREATE POLICY "Admins can update marker models"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'marker-models' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete marker models" ON storage.objects;
CREATE POLICY "Admins can delete marker models"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'marker-models' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Marker models are readable" ON storage.objects;
CREATE POLICY "Marker models are readable"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'marker-models');