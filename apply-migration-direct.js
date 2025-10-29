// Script para aplicar a migração usando a API REST do Supabase
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`)
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const error = await response.text()
      console.log(`⚠️  ${description}: ${error}`)
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
  console.log('🚀 Aplicando migração da tabela projects...\n')

  // Primeiro, vamos tentar criar a função exec_sql se ela não existir
  console.log('🔧 Verificando se a função exec_sql existe...')
  
  const createExecSqlFunction = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql: createExecSqlFunction })
    })

    if (response.ok) {
      console.log('✅ Função exec_sql criada/atualizada')
    } else {
      console.log('⚠️  Não foi possível criar a função exec_sql')
      console.log('Vamos tentar executar os comandos diretamente...')
      
      // Vamos tentar uma abordagem diferente - executar SQL diretamente
      await executeDirectSQL()
      return
    }
  } catch (err) {
    console.log('⚠️  Erro ao criar função exec_sql:', err.message)
    await executeDirectSQL()
    return
  }

  // Agora aplicar a migração
  const commands = [
    {
      sql: `
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
      `,
      description: 'Criando tabela projects'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);',
      description: 'Criando índice user_id'
    },
    {
      sql: 'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;',
      description: 'Habilitando RLS'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "projects_select_policy" ON "public"."projects";
        CREATE POLICY "projects_select_policy" ON "public"."projects"
        AS PERMISSIVE FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
      `,
      description: 'Criando política SELECT'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "projects_insert_policy" ON "public"."projects";
        CREATE POLICY "projects_insert_policy" ON "public"."projects"
        AS PERMISSIVE FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
      `,
      description: 'Criando política INSERT'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "projects_update_policy" ON "public"."projects";
        CREATE POLICY "projects_update_policy" ON "public"."projects"
        AS PERMISSIVE FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
      `,
      description: 'Criando política UPDATE'
    },
    {
      sql: `
        DROP POLICY IF EXISTS "projects_delete_policy" ON "public"."projects";
        CREATE POLICY "projects_delete_policy" ON "public"."projects"
        AS PERMISSIVE FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
      `,
      description: 'Criando política DELETE'
    }
  ]

  for (const command of commands) {
    await executeSQL(command.sql, command.description)
  }

  console.log('\n🎉 Migração concluída!')
}

async function executeDirectSQL() {
  console.log('🔄 Executando SQL diretamente via API...')
  
  // Vamos tentar criar a tabela diretamente usando a API do Supabase
  const { createClient } = require('@supabase/supabase-js')
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Primeiro, vamos verificar se a tabela já existe
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (!error) {
      console.log('✅ Tabela projects já existe!')
      return
    }
  } catch (err) {
    console.log('🔄 Tabela projects não existe, vamos criá-la...')
  }

  console.log('\n📝 Para aplicar a migração manualmente, execute os seguintes comandos no SQL Editor do Supabase:')
  console.log('=' * 80)
  console.log(`
-- 1. Criar tabela projects
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

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- 3. Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "projects_select_policy" ON "public"."projects"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_policy" ON "public"."projects"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_policy" ON "public"."projects"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_policy" ON "public"."projects"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Conceder permissões
GRANT ALL PRIVILEGES ON projects TO authenticated;
GRANT SELECT ON projects TO anon;
  `)
  console.log('=' * 80)
}

applyMigration().catch(console.error)