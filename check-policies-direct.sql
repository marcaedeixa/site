-- Script para verificar políticas RLS no Supabase SQL Editor
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Verificar se RLS está habilitado na tabela projects
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasrls
FROM pg_tables 
WHERE tablename = 'projects';

-- 2. Listar todas as políticas da tabela projects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;

-- 3. Verificar permissões da tabela
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'projects'
ORDER BY grantee, privilege_type;

-- 4. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 5. Testar inserção direta (deve funcionar no SQL Editor)
INSERT INTO projects (name, description, user_id) 
VALUES ('Teste SQL Editor', 'Projeto de teste direto', '1bf113d9-44c7-49f4-a392-3c9953577fc6');

-- 6. Verificar se foi inserido
SELECT * FROM projects WHERE name = 'Teste SQL Editor';

-- 7. Limpar teste
DELETE FROM projects WHERE name = 'Teste SQL Editor';