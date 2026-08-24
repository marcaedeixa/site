/**
 * Valida a ordem das migrations em supabase/migrations/.
 *
 * Percorre os arquivos em ordem alfabética — a mesma ordem em que qualquer
 * runner os aplica — e confere que nenhum deles referencia uma tabela ou
 * função que ainda não foi criada.
 *
 *   node scripts/check-migration-order.js
 */

const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', 'supabase', 'migrations')

// Objetos fornecidos pelo próprio Supabase, sempre disponíveis.
const BUILTIN_TABLES = new Set(['auth.users', 'auth.identities', 'storage.objects'])
const BUILTIN_FUNCTIONS = new Set(['now', 'uuid_generate_v4', 'gen_random_uuid'])

/** Remove comentários e literais para não casar padrões dentro deles. */
function strip(sql) {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
}

function collect(sql, regex, group = 1) {
  const out = new Set()
  let m
  while ((m = regex.exec(sql)) !== null) out.add(m[group].toLowerCase())
  return out
}

function analyze(sql) {
  const s = strip(sql)
  return {
    createsTables: collect(s, /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_.]*)/gi),
    altersTables: collect(s, /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?([a-z_][a-z0-9_.]*)/gi),
    referencesTables: collect(s, /REFERENCES\s+([a-z_][a-z0-9_.]*)/gi),
    policyOn: collect(s, /\bON\s+([a-z_][a-z0-9_.]*)\s*(?:FOR|USING|TO)\b/gi),
    createsFunctions: collect(s, /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-z_][a-z0-9_.]*)/gi),
    callsFunctions: collect(s, /EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+([a-z_][a-z0-9_.]*)/gi),
  }
}

function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()

  if (!files.length) {
    console.log('\n  Nenhuma migration encontrada.\n')
    process.exit(1)
  }

  const tables = new Set(BUILTIN_TABLES)
  const functions = new Set(BUILTIN_FUNCTIONS)
  const problems = []

  console.log(`\n  Validando ${files.length} migrations na ordem de aplicação\n`)

  for (const file of files) {
    const a = analyze(fs.readFileSync(path.join(DIR, file), 'utf8'))
    const issues = []

    // Dependências precisam existir ANTES deste arquivo rodar.
    const needed = new Set([...a.altersTables, ...a.referencesTables, ...a.policyOn])
    for (const t of needed) {
      if (a.createsTables.has(t)) continue // criada no próprio arquivo
      if (!tables.has(t)) issues.push(`tabela "${t}" ainda não existe`)
    }
    for (const fn of a.callsFunctions) {
      if (a.createsFunctions.has(fn)) continue
      if (!functions.has(fn)) issues.push(`função "${fn}()" ainda não existe`)
    }

    // Só depois de checar é que este arquivo passa a fornecer seus objetos.
    a.createsTables.forEach(t => tables.add(t))
    a.createsFunctions.forEach(f => functions.add(f))

    if (issues.length) {
      problems.push({ file, issues })
      console.log(`  \x1b[31m✗\x1b[0m ${file}`)
      issues.forEach(i => console.log(`      ${i}`))
    } else {
      console.log(`  \x1b[32m✓\x1b[0m ${file}`)
    }
  }

  console.log()
  if (problems.length) {
    console.log(`  \x1b[31m${problems.length} migration(s) fora de ordem.\x1b[0m\n`)
    process.exit(1)
  }
  console.log(`  \x1b[32mOrdem válida\x1b[0m — ${tables.size - BUILTIN_TABLES.size} tabelas criadas sem dependência quebrada.\n`)
}

main()
