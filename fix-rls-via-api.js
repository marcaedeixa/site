require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Corrigindo políticas RLS via API do Supabase...\n');

async function executeSQL(sql, description) {
  console.log(`📝 ${description}...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ⚠️ Resposta da API: ${response.status} - ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`   ✅ Executado com sucesso`);
    return true;
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function fixRLSPolicies() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('1. 🔍 Verificando configuração atual...');
  
  // Testar conexão
  const { data: testData, error: testError } = await supabase
    .from('projects')
    .select('count')
    .limit(1);

  if (testError) {
    console.error('❌ Erro de conexão:', testError);
    return;
  }
  console.log('   ✅ Conexão com Supabase OK');

  console.log('\n2. 🧹 Limpando políticas existentes...');
  
  // Desabilitar RLS temporariamente
  await executeSQL(
    'ALTER TABLE projects DISABLE ROW LEVEL SECURITY;',
    'Desabilitando RLS temporariamente'
  );

  // Remover políticas existentes
  const policiesToDrop = [
    'projects_select_policy',
    'projects_insert_policy', 
    'projects_update_policy',
    'projects_delete_policy',
    'projects_select',
    'projects_insert',
    'projects_update',
    'projects_delete',
    'Enable read access for authenticated users',
    'Enable insert for authenticated users only',
    'Enable update for users based on user_id',
    'Enable delete for users based on user_id',
    'allow_all_authenticated_select',
    'allow_all_authenticated_insert',
    'allow_all_authenticated_update',
    'allow_all_authenticated_delete'
  ];

  for (const policy of policiesToDrop) {
    await executeSQL(
      `DROP POLICY IF EXISTS "${policy}" ON projects;`,
      `Removendo política ${policy}`
    );
  }

  console.log('\n3. 🔐 Criando novas políticas RLS...');

  // Reabilitar RLS
  await executeSQL(
    'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;',
    'Reabilitando RLS'
  );

  // Criar políticas simples e funcionais
  const policies = [
    {
      name: 'projects_select_authenticated',
      sql: `CREATE POLICY "projects_select_authenticated" ON projects FOR SELECT TO authenticated USING (auth.uid() = user_id);`,
      description: 'Política SELECT para usuários autenticados'
    },
    {
      name: 'projects_insert_authenticated', 
      sql: `CREATE POLICY "projects_insert_authenticated" ON projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`,
      description: 'Política INSERT para usuários autenticados'
    },
    {
      name: 'projects_update_authenticated',
      sql: `CREATE POLICY "projects_update_authenticated" ON projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
      description: 'Política UPDATE para usuários autenticados'
    },
    {
      name: 'projects_delete_authenticated',
      sql: `CREATE POLICY "projects_delete_authenticated" ON projects FOR DELETE TO authenticated USING (auth.uid() = user_id);`,
      description: 'Política DELETE para usuários autenticados'
    }
  ];

  for (const policy of policies) {
    await executeSQL(policy.sql, policy.description);
  }

  console.log('\n4. 🔑 Configurando permissões...');
  
  // Conceder permissões
  await executeSQL(
    'GRANT ALL ON projects TO authenticated;',
    'Concedendo permissões para authenticated'
  );

  await executeSQL(
    'GRANT USAGE ON SCHEMA public TO authenticated;',
    'Concedendo uso do schema public'
  );

  console.log('\n5. 🧪 Testando configuração...');

  // Testar inserção com service role (deve funcionar)
  const testUserId = '1bf113d9-44c7-49f4-a392-3c9953577fc6';
  
  const { data: insertTest, error: insertError } = await supabase
    .from('projects')
    .insert({
      name: 'Teste RLS API',
      description: 'Projeto de teste via API',
      user_id: testUserId
    })
    .select();

  if (insertError) {
    console.log('   ❌ Erro no teste de inserção:', insertError);
  } else {
    console.log('   ✅ Teste de inserção funcionou!');
    
    // Limpar teste
    await supabase
      .from('projects')
      .delete()
      .eq('name', 'Teste RLS API');
    
    console.log('   🧹 Teste limpo');
  }

  console.log('\n✅ Correção de RLS concluída!');
  console.log('🔄 Agora teste criar um projeto na aplicação.');
}

fixRLSPolicies().catch(console.error);