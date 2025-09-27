-- Create actors table
CREATE TABLE IF NOT EXISTS actors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  initials VARCHAR(3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_actors_project_id ON actors(project_id);

-- Enable RLS (Row Level Security)
ALTER TABLE actors ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to see only their project's actors
CREATE POLICY "Users can view actors from their projects" ON actors
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to insert actors in their projects
CREATE POLICY "Users can insert actors in their projects" ON actors
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to update actors in their projects
CREATE POLICY "Users can update actors in their projects" ON actors
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to delete actors in their projects
CREATE POLICY "Users can delete actors in their projects" ON actors
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT ALL ON actors TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create trigger to automatically update updated_at (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_actors_updated_at') THEN
        CREATE TRIGGER update_actors_updated_at BEFORE UPDATE ON actors
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;