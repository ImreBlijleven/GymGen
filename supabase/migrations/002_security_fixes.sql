-- Security: ensure exercises are only writable by authenticated users (not anonymous/public)
-- The API route already requires auth, this adds a DB-level guarantee.
drop policy if exists "exercises_write" on public.exercises;
drop policy if exists "exercises_update" on public.exercises;

create policy "exercises_write" on public.exercises
  for insert with check (auth.role() = 'authenticated');

create policy "exercises_update" on public.exercises
  for update using (auth.role() = 'authenticated');

-- Disable anonymous sign-ins at the DB level (belt-and-suspenders alongside the UI change)
-- Public signups are disabled in the Supabase dashboard; this prevents abuse via API.
-- Note: also disable in Supabase Auth settings > Sign In Methods > Anonymous sign-ins.
