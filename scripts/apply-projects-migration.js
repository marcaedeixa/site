const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function applyProjectsMigration() {
  console.log('🚀 Aplicando migração da tabela projects...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('❌ Configurações do Supabase não encontradas!')
    return
  }
  
  // Usar service role para executar a migração
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_create_projects_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Lendo arquivo de migração...')
    console.log('Arquivo:', migrationPath)
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`\n🔧 Executando ${commands.length} comandos SQL...\n`)
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';'
      console.log(`${i + 1}. Executando comando...`)
      
      try {
        // Tentar executar o comando via rpc
        const { data, error } = await supabase.rpc('exec_sql', { sql: command })
        
        if (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`   ✅ Já existe (ignorando)`)
          } else {
            console.log(`   ❌ Erro:`, error.message)
          }
        } else {
          console.log(`   ✅ Sucesso`)
        }
      } catch (err) {
        // Se rpc não funcionar, tentar executar diretamente
        console.log(`   ⚠️ Tentativa alternativa...`)
        
        // Para comandos CREATE TABLE, vamos tentar via from
        if (command.includes('CREATE TABLE')) {
          console.log(`   📝 Comando CREATE TABLE detectado - execute manualmente no Supabase`)
        } else if (command.includes('CREATE POLICY')) {
          console.log(`   🔒 Comando CREATE POLICY detectado - execute manualmente no Supabase`)
        } else {
          console.log(`   ⚠️ Execute manualmente: ${command.substring(0, 50)}...`)
        }
      }
    }
    
    console.log('\n🎉 Migração processada!')
    console.log('\n📝 Se alguns comandos falharam, execute manualmente no Supabase SQL Editor:')
    console.log('=' .repeat(60))
    console.log(migrationSQL)
    console.log('=' .repeat(60))
    
    // Testar se a tabela foi criada
    console.log('\n🧪 Testando acesso à tabela projects...')
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Tabela projects ainda não acessível:', testError.message)
      console.log('   Execute a migração manualmente no Supabase SQL Editor')
    } else {
      console.log('✅ Tabela projects acessível!')
      
      // Testar criação de projeto
      console.log('\n🧪 Testando criação de projeto com usuário autenticado...')
      
      // Fazer login com o usuário de teste
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'teste@marcaedeixa.com',
        password: 'Teste123!'
      })
      
      if (authError) {
        console.log('❌ Erro no login:', authError.message)
        return
      }
      
      console.log('✅ Login realizado')
      
      // Tentar criar projeto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: 'Projeto de Teste Final',
          description: 'Teste após aplicação da migração'
        }])
        .select()
        .single()
      
      if (projectError) {
        console.log('❌ Ainda há erro na criação:', projectError.message)
        console.log('   Código:', projectError.code)
      } else {
        console.log('✅ Projeto criado com sucesso!')
        console.log('   ID:', projectData.id)
        console.log('   Nome:', projectData.name)
      }
      
      // Fazer logout
      await supabase.auth.signOut()
    }
    
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message)
  }
}

applyProjectsMigration()
