const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('🔐 Criando usuário administrativo...');
    
    // Dados do usuário administrativo
    const adminData = {
      email: 'admin@marcaedeixa.com',
      password: 'Admin123!',
      name: 'Administrador Principal',
      role: 'super_admin'
    };
    
    // Verificar se o usuário já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', adminData.email)
      .single();
    
    if (existingUser) {
      console.log('⚠️  Usuário administrativo já existe!');
      console.log('📧 Email:', adminData.email);
      console.log('🔗 Acesso: http://localhost:3001/admin/login');
      return;
    }
    
    // Gerar hash da senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    
    // Inserir usuário administrativo
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email: adminData.email,
        password_hash: passwordHash,
        name: adminData.name,
        role: adminData.role,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar usuário administrativo:', error.message);
      return;
    }
    
    console.log('✅ Usuário administrativo criado com sucesso!');
    console.log('');
    console.log('📋 CREDENCIAIS DE ACESSO:');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Senha:', adminData.password);
    console.log('👤 Nome:', adminData.name);
    console.log('🛡️  Role:', adminData.role);
    console.log('');
    console.log('🔗 Acesso: http://localhost:3001/admin/login');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('- Altere a senha padrão no primeiro acesso');
    console.log('- Mantenha as credenciais seguras');
    console.log('- Use reCAPTCHA para proteção adicional');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
  }
}

// Executar script
createAdminUser();