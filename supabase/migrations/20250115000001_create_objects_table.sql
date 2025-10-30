-- Create objects table
CREATE TABLE IF NOT EXISTS objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  initials VARCHAR(3) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  notes TEXT,
  appearance_config JSONB DEFAULT '{
    "shape": "square",
    "width": 80,
    "height": 80,
    "strokeDasharray": "5,5"
  }'::jsonb,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_objects_project_id ON objects(project_id);
CREATE INDEX IF NOT EXISTS idx_objects_user_id ON objects(user_id);
CREATE INDEX IF NOT EXISTS idx_objects_project_user ON objects(project_id, user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to see only their project's objects
CREATE POLICY "Users can view objects from their projects" ON objects
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to insert objects in their projects
CREATE POLICY "Users can insert objects in their projects" ON objects
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to update objects in their projects
CREATE POLICY "Users can update objects in their projects" ON objects
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to delete objects in their projects
CREATE POLICY "Users can delete objects in their projects" ON objects
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT ALL ON objects TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create trigger to automatically update updated_at (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_objects_updated_at') THEN
        CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON objects
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;