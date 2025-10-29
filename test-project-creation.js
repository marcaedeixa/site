const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testProjectCreation() {
  console.log('🧪 Testando criação de projeto...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Configurações do Supabase não encontradas!')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Primeiro, vamos verificar se a tabela projects existe
    console.log('1. Verificando se a tabela projects existe...')
    const { data: tables, error: tablesError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (tablesError) {
      console.log('❌ Erro ao acessar tabela projects:', tablesError.message)
      console.log('Código do erro:', tablesError.code)
      return
    }
    
    console.log('✅ Tabela projects acessível')
    
    // Agora vamos tentar criar um projeto de teste
    console.log('\n2. Tentando criar projeto de teste...')
    const testProject = {
      user_id: '550e8400-e29b-41d4-a716-446655440000', // UUID válido para teste
      name: 'Projeto de Teste',
      description: 'Teste de criação de projeto'
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single()
    
    if (error) {
      console.log('❌ Erro ao criar projeto:', error.message)
      console.log('Código do erro:', error.code)
      console.log('Detalhes:', error.details)
      console.log('Hint:', error.hint)
      return
    }
    
    console.log('✅ Projeto criado com sucesso!')
    console.log('Dados do projeto:', data)
    
    // Limpar o projeto de teste
    console.log('\n3. Removendo projeto de teste...')
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', data.id)
    
    if (deleteError) {
      console.log('⚠️ Erro ao remover projeto de teste:', deleteError.message)
    } else {
      console.log('✅ Projeto de teste removido')
    }
    
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message)
  }
}

testProjectCreation()