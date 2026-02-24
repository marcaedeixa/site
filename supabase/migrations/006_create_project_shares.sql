-- Migration: Create project_shares table for link-based sharing
-- Feature: View-only project sharing via unique token URL

-- 1. Create project_shares table
CREATE TABLE IF NOT EXISTS project_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_token VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One active share per project
    UNIQUE(project_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(share_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_project_shares_project ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_owner ON project_shares(owner_id);

-- 3. Enable RLS
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Owner can manage their own shares
CREATE POLICY "shares_select_owner" ON project_shares
    FOR SELECT TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "shares_insert_owner" ON project_shares
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shares_update_owner" ON project_shares
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shares_delete_owner" ON project_shares
    FOR DELETE TO authenticated
    USING (auth.uid() = owner_id);

-- Anyone can read active shares by token (for public share view)
CREATE POLICY "shares_select_by_token" ON project_shares
    FOR SELECT TO anon
    USING (is_active = true);

-- 5. Grant permissions
GRANT SELECT ON project_shares TO anon;
GRANT ALL ON project_shares TO authenticated;

-- 6. Trigger for updated_at
CREATE TRIGGER update_project_shares_updated_at
    BEFORE UPDATE ON project_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Add RLS policy on projects to allow public read via share token
-- This allows the share API to read project name/description when a valid share token exists
CREATE POLICY "projects_select_via_share" ON projects
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.project_id = projects.id
            AND project_shares.is_active = true
        )
    );

-- 8. Add RLS policy on project_data to allow public read via share token
CREATE POLICY "project_data_select_via_share" ON project_data
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.project_id = project_data.project_id
            AND project_shares.is_active = true
        )
    );
