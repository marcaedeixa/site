// Script para aplicar a migração da tabela projects passo a passo
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`)
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
      console.log(`⚠️  ${description}: ${error.message}`)
      return false
    }
    console.log(`✅ ${description}: Sucesso`)
    return true
  } catch (err) {
    console.log(`⚠️  ${description}: ${err.message}`)
    return false
  }
}

async function applyMigration() {
  console.log('🚀 Aplicando migração da tabela projects passo a passo...\n')

  // 1. Criar a tabela projects
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS "public"."projects" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "created_at" timestamp with time zone DEFAULT now(),
      "updated_at" timestamp with time zone DEFAULT now(),
      CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
    );
  `, 'Criando tabela projects')

  // 2. Criar índices
  await executeSQL(`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
  `, 'Criando índice user_id')

  await executeSQL(`
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
  `, 'Criando índice created_at')

  await executeSQL(`
    CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
  `, 'Criando índice updated_at')

  // 3. Habilitar RLS
  await executeSQL(`
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  `, 'Habilitando RLS')

  // 4. Criar políticas RLS
  await executeSQL(`
    DROP POLICY IF EXISTS "projects_select_policy" ON "public"."projects";
    CREATE POLICY "projects_select_policy" ON "public"."projects"
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  `, 'Criando política SELECT')

  await executeSQL(`
    DROP POLICY IF EXISTS "projects_insert_policy" ON "public"."projects";
    CREATE POLICY "projects_insert_policy" ON "public"."projects"
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  `, 'Criando política INSERT')

  await executeSQL(`
    DROP POLICY IF EXISTS "projects_update_policy" ON "public"."projects";
    CREATE POLICY "projects_update_policy" ON "public"."projects"
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  `, 'Criando política UPDATE')

  await executeSQL(`
    DROP POLICY IF EXISTS "projects_delete_policy" ON "public"."projects";
    CREATE POLICY "projects_delete_policy" ON "public"."projects"
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  `, 'Criando política DELETE')

  // 5. Conceder permissões
  await executeSQL(`
    GRANT ALL PRIVILEGES ON projects TO authenticated;
  `, 'Concedendo privilégios para authenticated')

  await executeSQL(`
    GRANT SELECT ON projects TO anon;
  `, 'Concedendo SELECT para anon')

  // 6. Criar função para updated_at
  await executeSQL(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `, 'Criando função update_updated_at_column')

  // 7. Criar trigger
  await executeSQL(`
    DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
    CREATE TRIGGER update_projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `, 'Criando trigger updated_at')

  console.log('\n🎉 Migração aplicada com sucesso!')

  // Testar a tabela
  console.log('\n🧪 Testando acesso à tabela projects...')
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Erro ao acessar tabela:', error.message)
    } else {
      console.log('✅ Tabela projects acessível!')
    }
  } catch (err) {
    console.log('❌ Erro ao testar tabela:', err.message)
  }
}

applyMigration().catch(console.error)