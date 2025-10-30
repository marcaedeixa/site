// Script para verificar e corrigir políticas RLS da tabela projects
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkTableExists() {
  console.log('🔍 Verificando se a tabela projects existe...')
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Tabela projects não existe ou não é acessível:', error.message)
      return false
    }
    
    console.log('✅ Tabela projects existe e é acessível')
    return true
  } catch (err) {
    console.log('❌ Erro ao verificar tabela:', err.message)
    return false
  }
}

async function checkRLSEnabled() {
  console.log('\n🔍 Verificando se RLS está habilitado...')
  
  try {
    // Usar uma query SQL direta para verificar RLS
    const { data, error } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'projects')
      .single()

    if (error) {
      console.log('⚠️  Não foi possível verificar RLS via pg_class')
      return false
    }

    if (data && data.relrowsecurity) {
      console.log('✅ RLS está habilitado na tabela projects')
      return true
    } else {
      console.log('❌ RLS não está habilitado na tabela projects')
      return false
    }
  } catch (err) {
    console.log('⚠️  Erro ao verificar RLS:', err.message)
    return false
  }
}

async function createProjectsTableWithRLS() {
  console.log('\n🔧 Criando/atualizando tabela projects com RLS...')
  
  const sqlCommands = [
    // 1. Criar tabela se não existir
    `
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
    
    // 2. Habilitar RLS
    `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`,
    
    // 3. Remover políticas existentes
    `DROP POLICY IF EXISTS "projects_select_policy" ON "public"."projects";`,
    `DROP POLICY IF EXISTS "projects_insert_policy" ON "public"."projects";`,
    `DROP POLICY IF EXISTS "projects_update_policy" ON "public"."projects";`,
    `DROP POLICY IF EXISTS "projects_delete_policy" ON "public"."projects";`,
    
    // 4. Criar políticas RLS
    `
    CREATE POLICY "projects_select_policy" ON "public"."projects"
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
    `,
    
    `
    CREATE POLICY "projects_insert_policy" ON "public"."projects"
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
    `,
    
    `
    CREATE POLICY "projects_update_policy" ON "public"."projects"
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    `,
    
    `
    CREATE POLICY "projects_delete_policy" ON "public"."projects"
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
    `,
    
    // 5. Conceder permissões
    `GRANT ALL PRIVILEGES ON projects TO authenticated;`,
    `GRANT SELECT ON projects TO anon;`
  ]

  console.log('\n📝 SQL Commands que precisam ser executados no Supabase SQL Editor:')
  console.log('=' * 80)
  
  for (let i = 0; i < sqlCommands.length; i++) {
    console.log(`-- Comando ${i + 1}:`)
    console.log(sqlCommands[i].trim())
    console.log('')
  }
  
  console.log('=' * 80)
  console.log('\n🔗 Acesse: https://supabase.com/dashboard/project/bxveecbtbleosmiijdrk/sql')
  console.log('📋 Copie e cole os comandos acima no SQL Editor e execute-os um por vez.')
  
  return true
}

async function testProjectCreation() {
  console.log('\n🧪 Testando criação de projeto com usuário autenticado...')
  
  // Fazer login com o usuário de teste
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@marcaedeixa.com',
    password: 'Teste123!'
  })

  if (authError) {
    console.log('❌ Erro no login:', authError.message)
    return false
  }

  console.log('✅ Login realizado')
  console.log('   User ID:', authData.user.id)

  // Tentar criar um projeto
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert([
      {
        user_id: authData.user.id,
        name: 'Projeto de Teste RLS',
        description: 'Teste das políticas RLS'
      }
    ])
    .select()

  if (projectError) {
    console.log('❌ Erro ao criar projeto:', projectError.message)
    console.log('   Código:', projectError.code)
    return false
  }

  console.log('✅ Projeto criado com sucesso!')
  console.log('   ID:', projectData[0].id)
  console.log('   Nome:', projectData[0].name)

  // Fazer logout
  await supabase.auth.signOut()
  
  return true
}

async function main() {
  console.log('🚀 Verificando e corrigindo políticas RLS da tabela projects...\n')

  // 1. Verificar se a tabela existe
  const tableExists = await checkTableExists()
  
  if (!tableExists) {
    console.log('\n❌ Tabela projects não existe. Criando...')
    await createProjectsTableWithRLS()
    return
  }

  // 2. Verificar RLS
  await checkRLSEnabled()

  // 3. Sempre mostrar os comandos SQL para garantir que as políticas estejam corretas
  await createProjectsTableWithRLS()

  // 4. Testar criação de projeto
  await testProjectCreation()
}

main().catch(console.error)