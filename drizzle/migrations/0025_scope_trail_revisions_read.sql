DROP POLICY IF EXISTS "Published revisions are public" ON public.trail_revisions;
CREATE POLICY "Revisions of published trails are readable" ON public.trail_revisions
FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.trails t WHERE t.id = trail_revisions.trail_id AND t.status = 'published')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.trail_sessions s WHERE s.revision_id = trail_revisions.id AND s.user_id = auth.uid())
);