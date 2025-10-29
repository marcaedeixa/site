const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSupabaseConfig() {
  console.log('🔍 Verificando configurações do Supabase...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('📋 Configurações atuais:')
  console.log(`   Supabase URL: ${supabaseUrl}`)
  console.log(`   Supabase Key: ${supabaseKey ? '✅ Configurada' : '❌ Não encontrada'}\n`)
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Configurações do Supabase não encontradas!')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('🔧 INSTRUÇÕES PARA CORRIGIR O PROBLEMA:\n')
  console.log('1. Acesse o painel do Supabase:')
  console.log('   https://supabase.com/dashboard\n')
  
  console.log('2. Selecione seu projeto e vá em Authentication → URL Configuration\n')
  
  console.log('3. Atualize as seguintes configurações:')
  console.log('   📍 Site URL: https://marcaedeixa.vercel.app')
  console.log('   📍 Redirect URLs (adicione todas essas linhas):')
  console.log('      https://marcaedeixa.vercel.app/auth/callback')
  console.log('      https://marcaedeixa-*.vercel.app/auth/callback')
  console.log('      http://localhost:3000/auth/callback\n')
  
  console.log('4. Configurações adicionais em Authentication → Settings:')
  console.log('   📍 Enable email confirmations: ✅ Ativado')
  console.log('   📍 Enable email change confirmations: ✅ Ativado')
  console.log('   📍 Enable phone confirmations: ❌ Desativado (opcional)\n')
  
  console.log('5. Salve as configurações e teste novamente o registro.\n')
  
  console.log('⚠️  IMPORTANTE:')
  console.log('   - As mudanças podem levar alguns minutos para propagar')
  console.log('   - Teste com um novo email após fazer as alterações')
  console.log('   - O link de confirmação agora deve redirecionar para o domínio correto\n')
  
  // Testar conexão básica
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log('⚠️  Aviso: Erro ao conectar com Supabase:', error.message)
    } else {
      console.log('✅ Conexão com Supabase funcionando')
    }
  } catch (err) {
    console.log('⚠️  Aviso: Erro na verificação:', err.message)
  }
}

checkSupabaseConfig().catch(console.error)