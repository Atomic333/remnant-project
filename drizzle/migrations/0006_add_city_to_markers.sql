ALTER TABLE public.markers ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Tacoma';

UPDATE public.markers SET city = 'Tacoma' WHERE city IS NULL OR city = '';