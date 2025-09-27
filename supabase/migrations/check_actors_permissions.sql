-- Verificar permissões da tabela actors
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'actors'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Verificar se RLS está habilitado
SELECT schemaname, tablename, pg_class.relrowsecurity as rowsecurity
FROM pg_tables 
JOIN pg_class ON pg_class.relname = pg_tables.tablename
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE schemaname = 'public' AND tablename = 'actors';

-- Verificar políticas RLS existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'actors';

-- Conceder permissões básicas se não existirem
GRANT SELECT, INSERT, UPDATE, DELETE ON actors TO authenticated;
GRANT SELECT ON actors TO anon;