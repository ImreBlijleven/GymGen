ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS run_preferences TEXT,
  ADD COLUMN IF NOT EXISTS swim_preferences TEXT;
