ALTER TABLE public.h5p_activities ADD COLUMN IF NOT EXISTS generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.h5p_activities ADD COLUMN IF NOT EXISTS kind text;