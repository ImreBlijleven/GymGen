-- Make exercises table work with ExerciseDB (string IDs) instead of WGER (integer IDs)
-- Add a unique constraint on name so we can upsert by name
alter table public.exercises
  alter column wger_id drop not null;

alter table public.exercises
  add column if not exists exercisedb_id text;

-- Add unique index on name for upsert-by-name
create unique index if not exists exercises_name_unique
  on public.exercises (lower(name));
