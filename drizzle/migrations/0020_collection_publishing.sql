CREATE OR REPLACE FUNCTION public.collection_marker_blockers(_marker text)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN (SELECT city_id FROM public.collection_markers WHERE marker_id = _marker) IS NULL THEN 'No city assigned' END
  ] || coalesce((SELECT array_agg(DISTINCT kind) FROM public.import_issues
       WHERE marker_id = _marker AND NOT resolved AND kind IN ('blocked','consultation','needs_verification','missing_city')), '{}'), NULL)
$$;

CREATE OR REPLACE FUNCTION public.enforce_collection_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published'
     AND cardinality(public.collection_marker_blockers(NEW.marker_id)) > 0 THEN
    RAISE EXCEPTION 'Story % is not ready to publish', NEW.marker_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER collection_markers_enforce_publish BEFORE UPDATE OF status ON public.collection_markers
FOR EACH ROW EXECUTE FUNCTION public.enforce_collection_publish();

CREATE OR REPLACE FUNCTION public.set_collection_status(_ids text[], _publish boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); done text[] := '{}'; skipped jsonb := '[]'::jsonb; mid text; b text[]; code text;
BEGIN
  IF uid IS NULL OR NOT public.can_edit_collections(uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'Not allowed.'); END IF;
  FOREACH mid IN ARRAY _ids LOOP
    IF _publish THEN
      b := public.collection_marker_blockers(mid);
      IF cardinality(b) > 0 THEN skipped := skipped || jsonb_build_object('id', mid, 'reasons', to_jsonb(b)); CONTINUE; END IF;
    END IF;
    UPDATE public.collection_markers SET status = CASE WHEN _publish THEN 'published' ELSE 'draft' END
      WHERE marker_id = mid RETURNING collection_code INTO code;
    IF FOUND THEN done := done || mid; END IF;
  END LOOP;
  UPDATE public.collections c SET status = CASE WHEN EXISTS (SELECT 1 FROM public.collection_markers m WHERE m.collection_code = c.code AND m.status = 'published') THEN 'published' ELSE 'draft' END;
  IF cardinality(done) > 0 THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, reason, details)
    VALUES (uid, CASE WHEN _publish THEN 'collection_publish' ELSE 'collection_unpublish' END, 'collection_marker', array_to_string(done, ','), 'Review queue', jsonb_build_object('ids', to_jsonb(done)));
  END IF;
  RETURN jsonb_build_object('ok', true, 'changed', to_jsonb(done), 'skipped', skipped);
END; $$;

REVOKE EXECUTE ON FUNCTION public.set_collection_status(text[], boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_collection_status(text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collection_marker_blockers(text) TO authenticated;