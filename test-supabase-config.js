require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testando configuração do Supabase...\n')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Configurada' : 'Não encontrada')

// Verificar se as variáveis estão configuradas corretamente
const isConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your-supabase-url' && 
  supabaseAnonKey !== 'your-supabase-anon-key'

console.log('\n✅ isSupabaseConfigured:', isConfigured)

if (!isConfigured) {
  console.log('\n❌ Problemas encontrados:')
  if (!supabaseUrl) console.log('- NEXT_PUBLIC_SUPABASE_URL não está definida')
  if (!supabaseAnonKey) console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida')
  if (supabaseUrl === 'your-supabase-url') console.log('- NEXT_PUBLIC_SUPABASE_URL ainda tem valor placeholder')
  if (supabaseAnonKey === 'your-supabase-anon-key') console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY ainda tem valor placeholder')
} else {
  console.log('\n✅ Configuração do Supabase está correta!')
}