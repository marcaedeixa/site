import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

async function executeSQL(sql, description) {
  try {
    console.log(`🔄 ${description}...`)
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
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
      console.log(`   ❌ Erro HTTP ${response.status}: ${error}`)
      return false
    }

    const result = await response.json()
    console.log(`   ✅ Sucesso`)
    if (result) console.log(`   📊 Resultado:`, result)
    return true
  } catch (err) {
    console.log(`   ❌ Erro inesperado: ${err.message}`)
    return false
  }
}

async function fixRLSWithRestAPI() {
  console.log('🔧 Corrigindo RLS usando REST API...\n')

  // Primeiro, vamos tentar criar a função exec se ela não existir
  console.log('🔧 Tentando criar função exec...')
  
  const createExecFunction = `
    CREATE OR REPLACE FUNCTION public.exec(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `

  await executeSQL(createExecFunction, 'Criando função exec')

  const commands = [
    'ALTER TABLE projects DISABLE ROW LEVEL SECURITY;',
    `DROP POLICY IF EXISTS "projects_select_policy" ON projects;
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
    'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;',
    `CREATE POLICY "projects_select_auth" ON projects
     FOR SELECT TO authenticated
     USING (auth.uid() = user_id);`,
    `CREATE POLICY "projects_insert_auth" ON projects
     FOR INSERT TO authenticated
     WITH CHECK (auth.uid() = user_id);`,
    `CREATE POLICY "projects_update_auth" ON projects
     FOR UPDATE TO authenticated
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);`,
    `CREATE POLICY "projects_delete_auth" ON projects
     FOR DELETE TO authenticated
     USING (auth.uid() = user_id);`,
    'GRANT ALL ON projects TO authenticated;',
    'GRANT USAGE ON SCHEMA public TO authenticated;'
  ]

  const descriptions = [
    'Desabilitando RLS temporariamente',
    'Removendo todas as políticas existentes',
    'Reabilitando RLS',
    'Criando política SELECT',
    'Criando política INSERT',
    'Criando política UPDATE',
    'Criando política DELETE',
    'Concedendo permissões na tabela',
    'Concedendo permissões no schema'
  ]

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < commands.length; i++) {
    const success = await executeSQL(commands[i], descriptions[i])
    if (success) {
      successCount++
    } else {
      errorCount++
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   ✅ Sucessos: ${successCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)

  console.log('\n🎉 Correção concluída!')
  console.log('🔄 Agora teste criar um projeto na aplicação.')
}

fixRLSWithRestAPI().catch(console.error)