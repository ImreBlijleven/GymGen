-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  age integer,
  fitness_level text not null default 'intermediate'
    check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  default_equipment text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workouts
create table public.workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz not null default now(),
  title text not null,
  source text not null check (source in ('chat', 'choices', 'saved')),
  plan jsonb not null,
  muscle_groups text[] not null default '{}',
  duration_minutes integer not null,
  location text not null
);

-- Exercises (local cache of WGER data)
create table public.exercises (
  wger_id integer primary key,
  name text not null,
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  gif_url text not null default '',
  description text not null default '',
  cached_at timestamptz not null default now()
);

create index exercises_name_idx on public.exercises using gin(to_tsvector('english', name));

-- Saved workouts
create table public.saved_workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  workout_id uuid references public.workouts on delete cascade not null,
  name text not null default 'Saved Workout',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, workout_id)
);

-- Row-level security
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.saved_workouts enable row level security;
alter table public.exercises enable row level security;

-- Profiles: users manage their own
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Workouts: users manage their own
create policy "workouts_self" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Saved workouts: users manage their own
create policy "saved_workouts_self" on public.saved_workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Exercises: readable by all authenticated users, writable by authenticated
create policy "exercises_read" on public.exercises
  for select using (auth.role() = 'authenticated');

create policy "exercises_write" on public.exercises
  for insert with check (auth.role() = 'authenticated');

create policy "exercises_update" on public.exercises
  for update using (auth.role() = 'authenticated');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
