ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_code text,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_share_code_key ON public.profiles (share_code) WHERE share_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_shared_visits(_code text)
RETURNS TABLE (
  display_name text,
  avatar_url text,
  marker_id text,
  visited_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.display_name, p.avatar_url, v.marker_id, v.visited_at
  FROM public.profiles p
  LEFT JOIN public.marker_visits v ON v.user_id = p.id
  WHERE p.share_code = _code
    AND p.share_enabled = true
  ORDER BY v.visited_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_visits(text) TO anon, authenticated;