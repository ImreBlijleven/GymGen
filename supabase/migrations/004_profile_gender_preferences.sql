-- Add gender and open preferences to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS preferences TEXT;
