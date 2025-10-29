-- COMANDOS SQL PARA EXECUTAR NO SUPABASE SQL EDITOR
-- Copie e cole estes comandos um por vez no Supabase Dashboard > SQL Editor

-- 1. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
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

-- 3. REABILITAR RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
CREATE POLICY "projects_select_auth" ON projects
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_auth" ON projects
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_auth" ON projects
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_auth" ON projects
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 5. CONCEDER PERMISSÕES
GRANT ALL ON projects TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 6. VERIFICAR SE FUNCIONOU
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'projects';

-- 7. LISTAR POLÍTICAS CRIADAS
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'projects';