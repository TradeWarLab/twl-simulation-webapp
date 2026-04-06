-- Migration: Add class_code and normalized_name to public.classes

-- 1. Add columns
ALTER TABLE public.classes ADD COLUMN normalized_name text;
ALTER TABLE public.classes ADD COLUMN class_code text;

-- 2. Backfill existing data
UPDATE public.classes SET normalized_name = 'class-' || id::text;
UPDATE public.classes SET class_code = upper(left(replace(id::text, '-', ''), 8));

-- 3. Add constraints
ALTER TABLE public.classes ALTER COLUMN normalized_name SET NOT NULL;
ALTER TABLE public.classes ALTER COLUMN class_code SET NOT NULL;
ALTER TABLE public.classes ADD CONSTRAINT classes_class_code_key UNIQUE (class_code);
