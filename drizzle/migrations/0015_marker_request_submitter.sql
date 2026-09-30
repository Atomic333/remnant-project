CREATE OR REPLACE FUNCTION public.set_request_submitter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.submitted_by := auth.uid();
  RETURN NEW;
END; $$;
CREATE TRIGGER marker_requests_set_submitter BEFORE INSERT ON public.marker_requests
FOR EACH ROW EXECUTE FUNCTION public.set_request_submitter();