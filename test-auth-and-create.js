const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testAuthAndCreate() {
  console.log('🔐 Testando autenticação e criação de projeto...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const supabase = createClient(supabaseUrl, anonKey)
  
  try {
    // 1. Verificar se há uma sessão ativa
    console.log('1. Verificando sessão atual...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Erro ao verificar sessão:', sessionError.message)
      return
    }
    
    if (session) {
      console.log('✅ Sessão ativa encontrada!')
      console.log('   User ID:', session.user.id)
      console.log('   Email:', session.user.email)
      
      // 2. Tentar criar um projeto com o usuário autenticado
      console.log('\n2. Tentando criar projeto com usuário autenticado...')
      const testProject = {
        user_id: session.user.id,
        name: 'Teste Autenticado',
        description: 'Teste com usuário autenticado'
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert(testProject)
        .select()
        .single()
      
      if (error) {
        console.log('❌ Erro na criação:', error.message)
        console.log('   Código:', error.code)
      } else {
        console.log('✅ Projeto criado com sucesso!')
        console.log('   ID:', data.id)
        console.log('   Nome:', data.name)
        
        // Limpar
        await supabase.from('projects').delete().eq('id', data.id)
        console.log('✅ Projeto de teste removido')
      }
    } else {
      console.log('❌ Nenhuma sessão ativa encontrada')
      console.log('   O usuário precisa fazer login primeiro')
      
      // 3. Verificar se há um usuário de teste que podemos usar
      console.log('\n3. Verificando usuários existentes...')
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
      
      if (usersError) {
        console.log('❌ Erro ao listar usuários:', usersError.message)
      } else {
        console.log(`📋 Encontrados ${users.users.length} usuários`)
        if (users.users.length > 0) {
          console.log('   Primeiro usuário:', users.users[0].email)
        }
      }
    }
    
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message)
  }
}

testAuthAndCreate()