alter table public.briefings
add column if not exists interest_group text,
add column if not exists file_url text;
