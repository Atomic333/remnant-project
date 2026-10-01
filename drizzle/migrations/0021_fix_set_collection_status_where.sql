CREATE OR REPLACE FUNCTION public.set_collection_status(_ids text[], _publish boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); done text[] := '{}'; skipped jsonb := '[]'::jsonb; mid text; b text[];
BEGIN
  IF uid IS NULL OR NOT public.can_edit_collections(uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'Not allowed.'); END IF;
  FOREACH mid IN ARRAY _ids LOOP
    IF _publish THEN
      b := public.collection_marker_blockers(mid);
      IF cardinality(b) > 0 THEN skipped := skipped || jsonb_build_object('id', mid, 'reasons', to_jsonb(b)); CONTINUE; END IF;
    END IF;
    UPDATE public.collection_markers SET status = CASE WHEN _publish THEN 'published' ELSE 'draft' END
      WHERE marker_id = mid;
    IF FOUND THEN done := done || mid; END IF;
  END LOOP;
  UPDATE public.collections c
     SET status = CASE WHEN EXISTS (SELECT 1 FROM public.collection_markers m WHERE m.collection_code = c.code AND m.status = 'published') THEN 'published' ELSE 'draft' END
   WHERE c.code IN (SELECT m.collection_code FROM public.collection_markers m WHERE m.marker_id = ANY(_ids));
  IF cardinality(done) > 0 THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, reason, details)
    VALUES (uid, CASE WHEN _publish THEN 'collection_publish' ELSE 'collection_unpublish' END, 'collection_marker', array_to_string(done, ','), 'Review queue', jsonb_build_object('ids', to_jsonb(done)));
  END IF;
  RETURN jsonb_build_object('ok', true, 'changed', to_jsonb(done), 'skipped', skipped);
END; $$;