require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis do Supabase não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAdminLogin() {
  console.log('🔍 Testando login administrativo...')
  
  const email = 'admin@marcaedeixa.com'
  const password = 'Admin123!'
  
  try {
    // Buscar usuário admin
    console.log('📧 Buscando usuário:', email)
    const { data: adminUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (fetchError) {
      console.error('❌ Erro ao buscar usuário:', fetchError.message)
      return
    }
    
    if (!adminUser) {
      console.error('❌ Usuário não encontrado')
      return
    }
    
    console.log('✅ Usuário encontrado:')
    console.log('  - ID:', adminUser.id)
    console.log('  - Email:', adminUser.email)
    console.log('  - Nome:', adminUser.name)
    console.log('  - Role:', adminUser.role)
    console.log('  - Ativo:', adminUser.is_active)
    console.log('  - Tentativas de login:', adminUser.login_attempts)
    console.log('  - Bloqueado até:', adminUser.locked_until)
    
    // Verificar senha
    console.log('🔐 Verificando senha...')
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash)
    
    if (passwordMatch) {
      console.log('✅ Senha correta!')
    } else {
      console.log('❌ Senha incorreta!')
      console.log('Hash armazenado:', adminUser.password_hash)
      
      // Tentar recriar o hash
      console.log('🔄 Recriando hash da senha...')
      const newHash = await bcrypt.hash(password, 12)
      console.log('Novo hash:', newHash)
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: newHash })
        .eq('id', adminUser.id)
      
      if (updateError) {
        console.error('❌ Erro ao atualizar senha:', updateError.message)
      } else {
        console.log('✅ Senha atualizada com sucesso!')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
  }
}

testAdminLogin()