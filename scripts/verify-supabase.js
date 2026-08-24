/**
 * Verifica se as credenciais do Supabase em .env.local estão corretas
 * e reporta o estado atual do schema.
 *
 *   node scripts/verify-supabase.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const OK = '\x1b[32m✓\x1b[0m'
const NO = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m!\x1b[0m'

// Tabelas esperadas conforme supabase/migrations/
const EXPECTED_TABLES = [
  'admin_users',
  'actors',
  'landing_page_content',
  'objects',
  'project_data',
  'project_shares',
  'projects',
  'stripe_customers',
  'stripe_subscriptions',
  'subscriptions',
  'user_actions',
]

/** Decodifica o payload de um JWT sem validar a assinatura. */
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function checkEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing = []
  if (!url || url.includes('COLE_AQUI')) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!anon || anon.includes('COLE_AQUI')) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!service || service.includes('COLE_AQUI')) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length) {
    console.log(`${NO} Faltam variáveis em .env.local:\n`)
    missing.forEach(v => console.log(`    ${v}`))
    console.log('\n  Pegue os valores em Project Settings → API Keys:')
    console.log('  https://supabase.com/dashboard/project/lwlpjeevrxzjtcmcrhaq/settings/api-keys\n')
    process.exit(1)
  }

  const projectRef = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  console.log(`${OK} Variáveis presentes`)
  console.log(`    projeto: ${projectRef}\n`)

  return { url, anon, service, projectRef }
}

function checkKeyShape(label, key, expectedRole, projectRef) {
  if (key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')) {
    console.log(`${NO} ${label}: formato novo (${key.slice(0, 16)}...)`)
    console.log('    Este projeto precisa das chaves em formato JWT (eyJhbGci...).')
    console.log('    Procure a aba "Legacy API keys" no painel.\n')
    return false
  }

  const claims = decodeJwt(key)
  if (!claims) {
    console.log(`${NO} ${label}: não é um JWT válido\n`)
    return false
  }
  if (claims.role !== expectedRole) {
    console.log(`${NO} ${label}: contém role "${claims.role}", esperava "${expectedRole}"`)
    console.log('    As chaves anon e service_role provavelmente foram trocadas.\n')
    return false
  }
  if (claims.ref && projectRef && claims.ref !== projectRef) {
    console.log(`${NO} ${label}: pertence ao projeto "${claims.ref}", não a "${projectRef}"\n`)
    return false
  }

  console.log(`${OK} ${label}: role "${claims.role}" confere`)
  return true
}

async function checkSchema(admin) {
  const found = []
  const missing = []

  for (const table of EXPECTED_TABLES) {
    const { error } = await admin.from(table).select('*', { count: 'exact', head: true })
    if (error && (error.code === '42P01' || /does not exist/i.test(error.message))) {
      missing.push(table)
    } else if (error) {
      console.log(`${WARN} ${table}: ${error.message}`)
    } else {
      found.push(table)
    }
  }

  console.log(`\n  Schema — ${found.length}/${EXPECTED_TABLES.length} tabelas encontradas`)
  if (found.length) console.log(`    presentes: ${found.join(', ')}`)
  if (missing.length) console.log(`    faltando:  ${missing.join(', ')}`)

  return { found, missing }
}

async function main() {
  console.log('\n  Verificando Supabase\n' + '  '.padEnd(40, '─') + '\n')

  const { url, anon, service, projectRef } = checkEnv()

  const anonOk = checkKeyShape('anon        ', anon, 'anon', projectRef)
  const serviceOk = checkKeyShape('service_role', service, 'service_role', projectRef)
  if (!anonOk || !serviceOk) process.exit(1)

  console.log()

  // Conexão com a chave anon
  const client = createClient(url, anon)
  const { error: anonErr } = await client.auth.getSession()
  console.log(anonErr ? `${NO} Conexão anon: ${anonErr.message}` : `${OK} Conexão anon funcionando`)

  // Conexão com a service_role — listUsers só responde com privilégio de admin
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: users, error: adminErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })

  if (adminErr) {
    console.log(`${NO} Conexão service_role: ${adminErr.message}`)
    process.exit(1)
  }
  console.log(`${OK} Conexão service_role funcionando`)
  console.log(`    usuários cadastrados: ${users.users.length === 0 ? 'nenhum (banco novo)' : users.users.length + '+'}`)

  const { missing } = await checkSchema(admin)

  console.log('\n' + '  '.padEnd(40, '─'))
  if (missing.length === EXPECTED_TABLES.length) {
    console.log('  Credenciais OK. Banco vazio — falta aplicar as migrations.\n')
  } else if (missing.length) {
    console.log('  Credenciais OK. Schema incompleto — ver tabelas faltando acima.\n')
  } else {
    console.log('  Credenciais OK e schema completo.\n')
  }
}

main().catch(err => {
  console.error(`\n${NO} Falha inesperada:`, err.message, '\n')
  process.exit(1)
})
