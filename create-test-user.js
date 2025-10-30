const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createTestUser() {
  console.log('👤 Criando usuário de teste...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('❌ Configurações do Supabase não encontradas!')
    return
  }
  
  // Usar service role para criar usuário
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  const testUserData = {
    email: 'teste@marcaedeixa.com',
    password: 'Teste123!',
    name: 'Usuário de Teste'
  }
  
  try {
    // Verificar se o usuário já existe
    console.log('1. Verificando se usuário já existe...')
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.log('❌ Erro ao listar usuários:', listError.message)
      return
    }
    
    const existingUser = existingUsers.users.find(user => user.email === testUserData.email)
    
    if (existingUser) {
      console.log('✅ Usuário de teste já existe!')
      console.log('   Email:', testUserData.email)
      console.log('   ID:', existingUser.id)
      console.log('   Criado em:', existingUser.created_at)
      console.log('\n🔗 Acesse: http://localhost:3001/login')
      console.log('📧 Email:', testUserData.email)
      console.log('🔑 Senha:', testUserData.password)
      return
    }
    
    // Criar novo usuário
    console.log('2. Criando novo usuário...')
    const { data, error } = await supabase.auth.admin.createUser({
      email: testUserData.email,
      password: testUserData.password,
      user_metadata: {
        name: testUserData.name
      },
      email_confirm: true // Confirmar email automaticamente
    })
    
    if (error) {
      console.log('❌ Erro ao criar usuário:', error.message)
      return
    }
    
    console.log('✅ Usuário de teste criado com sucesso!')
    console.log('   Email:', data.user.email)
    console.log('   ID:', data.user.id)
    console.log('   Nome:', data.user.user_metadata.name)
    
    // Verificar se a assinatura de teste foi criada automaticamente
    console.log('\n3. Verificando assinatura de teste...')
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans(name, is_trial)
      `)
      .eq('user_id', data.user.id)
      .single()
    
    if (subError) {
      console.log('⚠️ Nenhuma assinatura encontrada (pode ser normal)')
    } else {
      console.log('✅ Assinatura de teste criada automaticamente!')
      console.log('   Plano:', subscription.subscription_plans.name)
      console.log('   É trial:', subscription.subscription_plans.is_trial)
      console.log('   Status:', subscription.status)
      console.log('   Válida até:', subscription.end_date)
    }
    
    console.log('\n🎉 USUÁRIO DE TESTE PRONTO!')
    console.log('🔗 Acesse: http://localhost:3001/login')
    console.log('📧 Email:', testUserData.email)
    console.log('🔑 Senha:', testUserData.password)
    
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message)
  }
}

createTestUser()