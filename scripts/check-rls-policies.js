const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSupabaseConfig() {
  console.log('🔍 Verificando configuração do Supabase...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('📋 Variáveis de ambiente:')
  console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não encontrada')
  console.log('  ANON_KEY:', anonKey ? '✅ Configurada' : '❌ Não encontrada')
  console.log('  SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Configurada' : '❌ Não encontrada')
  
  if (!supabaseUrl || !anonKey) {
    console.log('\n❌ Configurações básicas do Supabase não encontradas!')
    return
  }
  
  // Testar com anon key (como o frontend faz)
  console.log('\n🔑 Testando com anon key...')
  const supabaseAnon = createClient(supabaseUrl, anonKey)
  
  try {
    // Verificar se conseguimos acessar a tabela projects
    const { data, error } = await supabaseAnon
      .from('projects')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Erro com anon key:', error.message)
      console.log('   Código:', error.code)
      console.log('   Detalhes:', error.details)
    } else {
      console.log('✅ Acesso à tabela projects funcionou com anon key')
    }
  } catch (err) {
    console.log('❌ Erro inesperado com anon key:', err.message)
  }
  
  // Testar com service role se disponível
  if (serviceRoleKey) {
    console.log('\n🔧 Testando com service role...')
    const supabaseService = createClient(supabaseUrl, serviceRoleKey)
    
    try {
      const { data, error } = await supabaseService
        .from('projects')
        .select('count')
        .limit(1)
      
      if (error) {
        console.log('❌ Erro com service role:', error.message)
      } else {
        console.log('✅ Acesso à tabela projects funcionou com service role')
      }
    } catch (err) {
      console.log('❌ Erro inesperado com service role:', err.message)
    }
  }
  
  // Testar criação sem autenticação
  console.log('\n🧪 Testando criação sem autenticação...')
  try {
    const testProject = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Teste Sem Auth',
      description: 'Teste sem autenticação'
    }
    
    const { data, error } = await supabaseAnon
      .from('projects')
      .insert(testProject)
      .select()
      .single()
    
    if (error) {
      console.log('❌ Erro na criação:', error.message)
      console.log('   Código:', error.code)
      
      if (error.code === '42501') {
        console.log('   🔒 Isso indica que RLS está ativo e requer autenticação')
      }
    } else {
      console.log('✅ Criação funcionou (RLS pode estar desabilitado)')
      
      // Limpar
      await supabaseAnon.from('projects').delete().eq('id', data.id)
    }
  } catch (err) {
    console.log('❌ Erro inesperado na criação:', err.message)
  }
}

checkSupabaseConfig()