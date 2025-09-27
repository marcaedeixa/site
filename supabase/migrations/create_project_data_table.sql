-- Create project_data table for storing visual editor data
CREATE TABLE IF NOT EXISTS project_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per project per user
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own project data" ON project_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project data" ON project_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project data" ON project_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project data" ON project_data
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON project_data TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_project_data_project_user ON project_data(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_data_updated_at ON project_data(updated_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_project_data_updated_at
  BEFORE UPDATE ON project_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();