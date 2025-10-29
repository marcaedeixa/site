-- Script SQL alternativo - Políticas RLS mais permissivas para teste
-- Execute este script se o anterior não funcionar

-- 1. Desabilitar RLS temporariamente
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

-- 3. Reabilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas mais permissivas (para teste)
CREATE POLICY "allow_all_authenticated_select" ON projects
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_all_authenticated_insert" ON projects
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_update" ON projects
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_delete" ON projects
FOR DELETE TO authenticated
USING (true);

-- 5. Conceder todas as permissões
GRANT ALL PRIVILEGES ON projects TO authenticated;
GRANT ALL PRIVILEGES ON projects TO anon;

-- 6. Verificar configuração
SELECT 'RLS Status' as info, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'projects';

SELECT 'Policies Count' as info, COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'projects';