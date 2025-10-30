// Script para aplicar a migração da tabela objects
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`)
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const error = await response.text()
      console.log(`⚠️  ${description}: ${error}`)
      return false
    }

    console.log(`✅ ${description}: Sucesso`)
    return true
  } catch (err) {
    console.log(`⚠️  ${description}: ${err.message}`)
    return false
  }
}

async function applyObjectsMigration() {
  console.log('🚀 Aplicando migração da tabela objects...\n')

  // Primeiro, vamos tentar criar a função exec_sql se ela não existir
  console.log('🔧 Verificando se a função exec_sql existe...')
  
  const createExecSqlFunction = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql: createExecSqlFunction })
    })

    if (response.ok) {
      console.log('✅ Função exec_sql criada/atualizada')
    }
  } catch (err) {
    console.log('⚠️  Erro ao criar função exec_sql:', err.message)
  }

  // Ler o arquivo de migração
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'create_objects_table.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Arquivo de migração não encontrado:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  // Executar a migração
  const success = await executeSQL(migrationSQL, 'Criando tabela objects')
  
  if (success) {
    console.log('\n🎉 Migração da tabela objects aplicada com sucesso!')
  } else {
    console.log('\n❌ Falha ao aplicar a migração da tabela objects')
    process.exit(1)
  }
}

applyObjectsMigration().catch(console.error)