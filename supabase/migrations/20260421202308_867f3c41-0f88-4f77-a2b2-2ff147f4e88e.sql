CREATE TABLE public.marker_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL,
  address TEXT,
  why_it_matters TEXT NOT NULL,
  submitter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marker_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous) can submit a marker request
CREATE POLICY "Anyone can submit a marker request"
  ON public.marker_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(location_name) BETWEEN 1 AND 200
    AND char_length(why_it_matters) BETWEEN 1 AND 2000
    AND (address IS NULL OR char_length(address) <= 500)
    AND (submitter_email IS NULL OR char_length(submitter_email) <= 255)
  );