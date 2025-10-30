import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
  process.exit(1)
}

// Cliente com service role (bypass RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQL(sql, description) {
  try {
    console.log(`🔄 ${description}...`)
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.log(`   ❌ Erro: ${error.message}`)
      return false
    } else {
      console.log(`   ✅ Sucesso`)
      if (data) console.log(`   📊 Resultado:`, data)
      return true
    }
  } catch (err) {
    console.log(`   ❌ Erro inesperado: ${err.message}`)
    return false
  }
}

async function fixRLSWithServiceRole() {
  console.log('🔧 Corrigindo RLS usando Service Role Key...\n')

  const commands = [
    {
      sql: 'ALTER TABLE projects DISABLE ROW LEVEL SECURITY;',
      desc: 'Desabilitando RLS temporariamente'
    },
    {
      sql: `DROP POLICY IF EXISTS "projects_select_policy" ON projects;
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
            DROP POLICY IF EXISTS "projects_select_auth" ON projects;
            DROP POLICY IF EXISTS "projects_insert_auth" ON projects;
            DROP POLICY IF EXISTS "projects_update_auth" ON projects;
            DROP POLICY IF EXISTS "projects_delete_auth" ON projects;`,
      desc: 'Removendo todas as políticas existentes'
    },
    {
      sql: 'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;',
      desc: 'Reabilitando RLS'
    },
    {
      sql: `CREATE POLICY "projects_select_auth" ON projects
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);`,
      desc: 'Criando política SELECT'
    },
    {
      sql: `CREATE POLICY "projects_insert_auth" ON projects
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);`,
      desc: 'Criando política INSERT'
    },
    {
      sql: `CREATE POLICY "projects_update_auth" ON projects
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);`,
      desc: 'Criando política UPDATE'
    },
    {
      sql: `CREATE POLICY "projects_delete_auth" ON projects
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);`,
      desc: 'Criando política DELETE'
    },
    {
      sql: 'GRANT ALL ON projects TO authenticated;',
      desc: 'Concedendo permissões na tabela'
    },
    {
      sql: 'GRANT USAGE ON SCHEMA public TO authenticated;',
      desc: 'Concedendo permissões no schema'
    }
  ]

  let successCount = 0
  let errorCount = 0

  for (const command of commands) {
    const success = await executeSQL(command.sql, command.desc)
    if (success) {
      successCount++
    } else {
      errorCount++
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   ✅ Sucessos: ${successCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)

  // Verificar configuração final
  console.log('\n🔍 Verificando configuração final...')
  
  const { data: tableInfo, error: tableError } = await supabase
    .from('pg_tables')
    .select('schemaname, tablename, rowsecurity')
    .eq('tablename', 'projects')

  if (tableError) {
    console.log('❌ Erro ao verificar tabela:', tableError.message)
  } else {
    console.log('✅ Configuração da tabela:', tableInfo)
  }

  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, roles')
    .eq('tablename', 'projects')

  if (policiesError) {
    console.log('❌ Erro ao verificar políticas:', policiesError.message)
  } else {
    console.log('✅ Políticas criadas:', policies)
  }

  // Teste final
  console.log('\n🧪 Teste final de inserção...')
  const { data: testProject, error: testError } = await supabase
    .from('projects')
    .insert({
      user_id: '1bf113d9-44c7-49f4-a392-3c9953577fc6', // ID do usuário de teste
      name: 'Teste Service Role',
      description: 'Projeto de teste criado via service role'
    })
    .select()
    .single()

  if (testError) {
    console.log('❌ Erro no teste:', testError.message)
  } else {
    console.log('✅ Teste de inserção funcionou:', testProject)
    
    // Limpar teste
    await supabase
      .from('projects')
      .delete()
      .eq('id', testProject.id)
    console.log('🧹 Teste limpo')
  }

  console.log('\n🎉 Correção concluída!')
  console.log('🔄 Agora teste criar um projeto na aplicação.')
}

fixRLSWithServiceRole().catch(console.error)