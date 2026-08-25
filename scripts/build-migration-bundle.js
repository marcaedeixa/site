/**
 * Concatena todas as migrations, na ordem de aplicação, num arquivo único
 * pronto para colar no SQL Editor do Supabase.
 *
 *   node scripts/build-migration-bundle.js [destino.sql]
 *
 * Valide a ordem antes com: node scripts/check-migration-order.js
 */

const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', 'supabase', 'migrations')
const out = process.argv[2] || path.join(__dirname, '..', 'supabase', 'bundle.generated.sql')

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()

const header = `-- ============================================================
--  Marca e Deixa — todas as migrations na ordem de aplicação
--  GERADO por scripts/build-migration-bundle.js — não edite à mão.
--  Origem: supabase/migrations/ (${files.length} arquivos)
-- ============================================================

`

const body = files
  .map((f, i) => {
    const sql = fs.readFileSync(path.join(DIR, f), 'utf8').trim()
    return `-- ─────────────────────────────────────────────────────────\n` +
           `-- [${String(i + 1).padStart(2, '0')}/${files.length}] ${f}\n` +
           `-- ─────────────────────────────────────────────────────────\n\n${sql}\n`
  })
  .join('\n')

fs.writeFileSync(out, header + body)

const kb = (fs.statSync(out).size / 1024).toFixed(1)
console.log(`\n  ✓ ${files.length} migrations agrupadas → ${path.relative(process.cwd(), out)} (${kb} KB)\n`)
