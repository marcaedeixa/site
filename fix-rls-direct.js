// Script para corrigir políticas RLS da tabela projects diretamente
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

async function fixRLSPolicies() {
  console.log('🚀 Corrigindo políticas RLS da tabela projects...\n')

  console.log('📋 Comandos SQL que devem ser executados no Supabase SQL Editor:')
  console.log('=' .repeat(60))
  
  const sqlCommands = [
    '-- 1. Habilitar RLS na tabela projects',
    'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;',
    '',
    '-- 2. Remover políticas existentes (se houver)',
    'DROP POLICY IF EXISTS "projects_select_policy" ON "public"."projects";',
    'DROP POLICY IF EXISTS "projects_insert_policy" ON "public"."projects";',
    'DROP POLICY IF EXISTS "projects_update_policy" ON "public"."projects";',
    'DROP POLICY IF EXISTS "projects_delete_policy" ON "public"."projects";',
    '',
    '-- 3. Criar política SELECT',
    'CREATE POLICY "projects_select_policy" ON "public"."projects"',
    'AS PERMISSIVE FOR SELECT',
    'TO authenticated',
    'USING (auth.uid() = user_id);',
    '',
    '-- 4. Criar política INSERT',
    'CREATE POLICY "projects_insert_policy" ON "public"."projects"',
    'AS PERMISSIVE FOR INSERT',
    'TO authenticated',
    'WITH CHECK (auth.uid() = user_id);',
    '',
    '-- 5. Criar política UPDATE',
    'CREATE POLICY "projects_update_policy" ON "public"."projects"',
    'AS PERMISSIVE FOR UPDATE',
    'TO authenticated',
    'USING (auth.uid() = user_id)',
    'WITH CHECK (auth.uid() = user_id);',
    '',
    '-- 6. Criar política DELETE',
    'CREATE POLICY "projects_delete_policy" ON "public"."projects"',
    'AS PERMISSIVE FOR DELETE',
    'TO authenticated',
    'USING (auth.uid() = user_id);',
    '',
    '-- 7. Conceder permissões',
    'GRANT ALL PRIVILEGES ON projects TO authenticated;',
    'GRANT SELECT ON projects TO anon;'
  ]

  sqlCommands.forEach(cmd => console.log(cmd))
  
  console.log('=' .repeat(60))
  console.log('\n📝 Instruções:')
  console.log('1. Acesse o Supabase Dashboard')
  console.log('2. Vá para SQL Editor')
  console.log('3. Cole e execute os comandos acima')
  console.log('4. Teste a criação de projetos na aplicação')

  // Testar a tabela atual
  console.log('\n🧪 Testando acesso atual à tabela projects...')
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Erro ao acessar tabela:', error.message)
    } else {
      console.log('✅ Tabela projects acessível!')
      console.log('📊 Registros encontrados:', data?.length || 0)
    }
  } catch (err) {
    console.log('❌ Erro ao testar tabela:', err.message)
  }

  // Testar criação de projeto (deve falhar sem autenticação)
  console.log('\n🧪 Testando criação de projeto sem autenticação (deve falhar)...')
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'Teste RLS',
        description: 'Teste de política RLS'
      })

    if (error) {
      console.log('✅ RLS funcionando! Erro esperado:', error.message)
    } else {
      console.log('⚠️  RLS pode não estar funcionando - inserção foi bem-sucedida')
    }
  } catch (err) {
    console.log('✅ RLS funcionando! Erro esperado:', err.message)
  }
}

fixRLSPolicies().catch(console.error)