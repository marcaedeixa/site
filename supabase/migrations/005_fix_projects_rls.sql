-- Migração para corrigir políticas RLS da tabela projects
-- Arquivo: 005_fix_projects_rls.sql

-- 1. Desabilitar RLS temporariamente para limpeza
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes (se existirem)
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON projects;
DROP POLICY IF EXISTS "allow_all_authenticated_select" ON projects;
DROP POLICY IF EXISTS "allow_all_authenticated_insert" ON projects;
DROP POLICY IF EXISTS "allow_all_authenticated_update" ON projects;
DROP POLICY IF EXISTS "allow_all_authenticated_delete" ON projects;
DROP POLICY IF EXISTS "projects_select_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_insert_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_update_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_delete_authenticated" ON projects;

-- 3. Reabilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS funcionais
CREATE POLICY "projects_select_authenticated" ON projects
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_authenticated" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_authenticated" ON projects
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_authenticated" ON projects
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 5. Conceder permissões necessárias
GRANT ALL ON projects TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 6. Verificar se as políticas foram criadas
DO $$
BEGIN
    RAISE NOTICE 'Políticas RLS criadas para a tabela projects:';
    RAISE NOTICE '- projects_select_authenticated';
    RAISE NOTICE '- projects_insert_authenticated';
    RAISE NOTICE '- projects_update_authenticated';
    RAISE NOTICE '- projects_delete_authenticated';
    RAISE NOTICE 'RLS habilitado e permissões concedidas.';
END $$;