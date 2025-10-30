// Script simples para aplicar a migração da tabela objects
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

async function executeMigration() {
  console.log('🚀 Aplicando migração da tabela objects...\n')

  // Ler o arquivo de migração
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'create_objects_table.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  try {
    // Executar a migração usando a API REST do Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ 
        sql: migrationSQL
      })
    })

    if (!response.ok) {
      // Tentar método alternativo - executar SQL diretamente
      console.log('⚠️  Tentando método alternativo...')
      
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceRoleKey)
      
      // Dividir o SQL em comandos individuais
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

      for (const command of commands) {
        if (command.trim()) {
          console.log(`🔄 Executando: ${command.substring(0, 50)}...`)
          const { error } = await supabase.rpc('exec', { sql: command + ';' })
          if (error) {
            console.log(`⚠️  Erro: ${error.message}`)
          } else {
            console.log('✅ Sucesso')
          }
        }
      }
    } else {
      console.log('✅ Migração aplicada com sucesso!')
    }

  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err.message)
    process.exit(1)
  }
}

executeMigration()