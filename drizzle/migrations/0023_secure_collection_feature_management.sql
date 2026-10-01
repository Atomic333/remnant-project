CREATE OR REPLACE FUNCTION public.can_manage_marker(_user_id uuid, _slug text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  IF NOT public.is_creator(_user_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.markers
    WHERE slug = _slug AND created_by = _user_id
  ) OR (
    public.can_edit_collections(_user_id)
    AND EXISTS (
      SELECT 1 FROM public.collection_markers
      WHERE marker_id = _slug
    )
  );
END;
$$;