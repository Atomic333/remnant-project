CREATE POLICY "Anyone can read marker photos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'marker-photos');

CREATE POLICY "Admins can upload marker photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marker-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update marker photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marker-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete marker photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marker-photos' AND public.has_role(auth.uid(), 'admin'));