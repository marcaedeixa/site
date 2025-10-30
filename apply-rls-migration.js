require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Aplicando migração RLS para tabela projects...\n');

async function applyMigration() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '005_fix_projects_rls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migração carregada:', migrationPath);
    console.log('📝 Conteúdo da migração:');
    console.log('─'.repeat(50));
    console.log(migrationSQL);
    console.log('─'.repeat(50));

    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`\n🔧 Executando ${commands.length} comandos SQL...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.includes('DO $$')) {
        // Pular blocos DO $$ pois não são suportados via client
        console.log(`${i + 1}. ⏭️ Pulando bloco DO (não suportado via client)`);
        continue;
      }

      console.log(`${i + 1}. 🔄 Executando: ${command.substring(0, 50)}...`);

      try {
        // Usar rpc para executar SQL bruto
        const { data, error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.log(`   ❌ Erro: ${error.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Sucesso`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Erro de execução: ${err.message}`);
        errorCount++;
      }

      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Resumo da migração:`);
    console.log(`   ✅ Sucessos: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);

    // Testar a configuração final
    console.log('\n🧪 Testando configuração final...');

    // Teste 1: Verificar se conseguimos acessar a tabela
    const { data: testAccess, error: accessError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);

    if (accessError) {
      console.log('❌ Erro de acesso à tabela:', accessError);
    } else {
      console.log('✅ Acesso à tabela OK');
    }

    // Teste 2: Tentar inserir um projeto de teste
    const testUserId = '1bf113d9-44c7-49f4-a392-3c9953577fc6';
    
    const { data: insertTest, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: 'Teste Migração RLS',
        description: 'Projeto de teste após migração',
        user_id: testUserId
      })
      .select();

    if (insertError) {
      console.log('❌ Erro no teste de inserção:', insertError);
    } else {
      console.log('✅ Teste de inserção funcionou!');
      console.log('   Projeto criado:', insertTest[0]);
      
      // Limpar teste
      await supabase
        .from('projects')
        .delete()
        .eq('name', 'Teste Migração RLS');
      
      console.log('   🧹 Teste limpo');
    }

    console.log('\n🎉 Migração concluída!');
    console.log('🔄 Agora teste criar um projeto na aplicação.');

  } catch (error) {
    console.error('❌ Erro geral na migração:', error);
  }
}

applyMigration();