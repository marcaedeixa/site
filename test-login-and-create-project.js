const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testLoginAndCreateProject() {
  console.log('🧪 Testando login e criação de projeto...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !anonKey) {
    console.log('❌ Configurações do Supabase não encontradas!')
    return
  }
  
  // Criar cliente Supabase (como no frontend)
  const supabase = createClient(supabaseUrl, anonKey)
  
  const testUser = {
    email: 'teste@marcaedeixa.com',
    password: 'Teste123!'
  }
  
  try {
    // 1. Fazer login
    console.log('1. 🔐 Fazendo login...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })
    
    if (authError) {
      console.log('❌ Erro no login:', authError.message)
      return
    }
    
    console.log('✅ Login realizado com sucesso!')
    console.log('   User ID:', authData.user.id)
    console.log('   Email:', authData.user.email)
    console.log('   Nome:', authData.user.user_metadata?.name || 'N/A')
    
    // 2. Verificar sessão
    console.log('\n2. 🔍 Verificando sessão...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData.session) {
      console.log('❌ Erro na sessão:', sessionError?.message || 'Sessão não encontrada')
      return
    }
    
    console.log('✅ Sessão ativa!')
    console.log('   Access Token:', sessionData.session.access_token.substring(0, 20) + '...')
    console.log('   Expires At:', new Date(sessionData.session.expires_at * 1000).toLocaleString())
    
    // 3. Tentar criar um projeto
    console.log('\n3. 📁 Tentando criar projeto...')
    const projectData = {
      name: 'Projeto de Teste',
      description: 'Projeto criado automaticamente para teste'
    }
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()
    
    if (projectError) {
      console.log('❌ Erro ao criar projeto:', projectError.message)
      console.log('   Código:', projectError.code)
      console.log('   Detalhes:', projectError.details)
      console.log('   Hint:', projectError.hint)
      
      // Verificar se é problema de RLS
      if (projectError.code === '42501') {
        console.log('\n🔒 Problema de RLS detectado!')
        console.log('   O usuário está autenticado, mas o RLS está bloqueando a inserção.')
        console.log('   Verificando políticas de RLS...')
        
        // Tentar verificar as políticas
        const { data: policies, error: policiesError } = await supabase
          .rpc('get_table_policies', { table_name: 'projects' })
          .catch(() => ({ data: null, error: { message: 'Função não disponível' } }))
        
        if (policiesError) {
          console.log('   ⚠️ Não foi possível verificar políticas:', policiesError.message)
        } else {
          console.log('   📋 Políticas encontradas:', policies)
        }
      }
      
      return
    }
    
    console.log('✅ Projeto criado com sucesso!')
    console.log('   ID:', project.id)
    console.log('   Nome:', project.name)
    console.log('   Descrição:', project.description)
    console.log('   User ID:', project.user_id)
    console.log('   Criado em:', project.created_at)
    
    // 4. Verificar se o projeto aparece na listagem
    console.log('\n4. 📋 Verificando listagem de projetos...')
    const { data: projects, error: listError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', authData.user.id)
    
    if (listError) {
      console.log('❌ Erro ao listar projetos:', listError.message)
      return
    }
    
    console.log('✅ Projetos do usuário:')
    projects.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`)
    })
    
    // 5. Fazer logout
    console.log('\n5. 🚪 Fazendo logout...')
    const { error: logoutError } = await supabase.auth.signOut()
    
    if (logoutError) {
      console.log('❌ Erro no logout:', logoutError.message)
    } else {
      console.log('✅ Logout realizado com sucesso!')
    }
    
    console.log('\n🎉 TESTE COMPLETO!')
    console.log('✅ Login funcionando')
    console.log('✅ Sessão funcionando')
    console.log('✅ Criação de projeto funcionando')
    console.log('✅ Listagem de projetos funcionando')
    console.log('✅ Logout funcionando')
    
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message)
    console.log('Stack:', err.stack)
  }
}

testLoginAndCreateProject()