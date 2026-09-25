ALTER TABLE public.markers ADD COLUMN IF NOT EXISTS state text DEFAULT 'WA';
UPDATE public.markers SET state = 'WA' WHERE state IS NULL;