require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verificando políticas RLS atuais...\n');

async function checkCurrentPolicies() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Verificar se RLS está habilitado
    console.log('1. 📋 Verificando status do RLS...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename, rowsecurity')
      .eq('tablename', 'projects');

    if (tableError) {
      console.error('❌ Erro ao verificar tabela:', tableError);
      return;
    }

    console.log('   Tabela projects:', tableInfo);

    // Verificar políticas existentes
    console.log('\n2. 🔐 Verificando políticas existentes...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'projects');

    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
      return;
    }

    console.log('   Políticas encontradas:', policies.length);
    policies.forEach((policy, index) => {
      console.log(`   ${index + 1}. ${policy.policyname}`);
      console.log(`      Comando: ${policy.cmd}`);
      console.log(`      Roles: ${policy.roles}`);
      console.log(`      Qual: ${policy.qual}`);
      console.log(`      With Check: ${policy.with_check}`);
      console.log('');
    });

    // Testar acesso direto com service role
    console.log('3. 🧪 Testando inserção com service role...');
    const { data: insertTest, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: 'Teste Service Role',
        description: 'Projeto de teste com service role',
        user_id: '1bf113d9-44c7-49f4-a392-3c9953577fc6'
      })
      .select();

    if (insertError) {
      console.error('❌ Erro na inserção com service role:', insertError);
    } else {
      console.log('✅ Inserção com service role funcionou!');
      console.log('   Projeto criado:', insertTest);
      
      // Limpar o teste
      await supabase
        .from('projects')
        .delete()
        .eq('name', 'Teste Service Role');
    }

    // Verificar permissões da tabela
    console.log('\n4. 🔑 Verificando permissões da tabela...');
    const { data: permissions, error: permError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT 
            grantee,
            privilege_type,
            is_grantable
          FROM information_schema.table_privileges 
          WHERE table_name = 'projects'
          ORDER BY grantee, privilege_type;
        `
      });

    if (permError) {
      console.log('   ⚠️ Não foi possível verificar permissões via RPC');
    } else {
      console.log('   Permissões da tabela:', permissions);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkCurrentPolicies();