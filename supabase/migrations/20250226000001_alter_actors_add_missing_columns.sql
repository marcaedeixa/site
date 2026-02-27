-- Add missing columns to actors table to match objects table pattern and application code
-- The code already references user_id, notes, appearance_config, and default_speech_bubble
-- but the original migration didn't include them.

-- 1. Add user_id column (matching objects table pattern)
ALTER TABLE actors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add notes column
ALTER TABLE actors ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add appearance_config JSONB column (stores shape, size, initials)
ALTER TABLE actors ADD COLUMN IF NOT EXISTS appearance_config JSONB DEFAULT '{
  "shape": "circle",
  "size": 50,
  "initials": ""
}'::jsonb;

-- 4. Add default_speech_bubble JSONB column (stores bubble styling)
ALTER TABLE actors ADD COLUMN IF NOT EXISTS default_speech_bubble JSONB DEFAULT '{
  "style": "rounded",
  "color": "#ffffff",
  "textColor": "#000000"
}'::jsonb;

-- 5. Backfill user_id from projects table for any existing actors
UPDATE actors
SET user_id = projects.user_id
FROM projects
WHERE actors.project_id = projects.id
  AND actors.user_id IS NULL;

-- 6. Make user_id NOT NULL after backfill (matching objects table)
ALTER TABLE actors ALTER COLUMN user_id SET NOT NULL;

-- 7. Create indexes for user_id (matching objects table pattern)
CREATE INDEX IF NOT EXISTS idx_actors_user_id ON actors(user_id);
CREATE INDEX IF NOT EXISTS idx_actors_project_user ON actors(project_id, user_id);
