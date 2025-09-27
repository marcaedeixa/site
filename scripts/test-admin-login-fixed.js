const dotenv = require('dotenv')

// Carregar variáveis de ambiente
dotenv.config()

async function testAdminLogin() {
  console.log('🧪 Testando login administrativo...')
  
  try {
    const response = await fetch('http://localhost:3001/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@marcaedeixa.com',
        password: 'Admin123!',
        recaptchaToken: 'test-token'
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Login bem-sucedido!')
      console.log('👤 Usuário:', data.user.email)
      console.log('🔑 Role:', data.user.role)
      console.log('📅 Último login:', data.user.last_login)
    } else {
      console.log('❌ Erro no login:', data.error)
      console.log('📊 Status:', response.status)
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message)
  }
}

// Executar teste
testAdminLogin()