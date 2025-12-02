import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSetup() {
  console.log('🔍 Verificando configuração do Stripe...\n')
  
  // 1. Verificar tabelas do Supabase
  console.log('📊 TABELAS SUPABASE:')
  const tables = ['stripe_customers', 'stripe_subscriptions', 'stripe_payments', 'stripe_webhook_events']
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error && error.code === '42P01') {
      console.log(`   ❌ ${table} - NÃO EXISTE`)
    } else if (error) {
      console.log(`   ⚠️  ${table} - Erro: ${error.message}`)
    } else {
      console.log(`   ✅ ${table} - OK`)
    }
  }
  
  // 2. Verificar conexão com Stripe
  console.log('\n💳 CONEXÃO STRIPE:')
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('   ❌ STRIPE_SECRET_KEY não configurada')
    return
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia'
  })
  
  try {
    const balance = await stripe.balance.retrieve()
    console.log('   ✅ Conectado ao Stripe')
    console.log(`   📍 Modo: ${process.env.STRIPE_MODE || 'test'}`)
  } catch (err) {
    console.log(`   ❌ Erro ao conectar: ${err.message}`)
    return
  }
  
  // 3. Listar produtos existentes
  console.log('\n📦 PRODUTOS NO STRIPE:')
  const products = await stripe.products.list({ limit: 10 })
  if (products.data.length === 0) {
    console.log('   ⚠️  Nenhum produto encontrado - precisa criar')
  } else {
    for (const product of products.data) {
      console.log(`   📦 ${product.name} (${product.id}) - ${product.active ? 'Ativo' : 'Inativo'}`)
      const prices = await stripe.prices.list({ product: product.id, limit: 10 })
      for (const price of prices.data) {
        const amount = (price.unit_amount / 100).toFixed(2)
        const interval = price.recurring?.interval || 'único'
        console.log(`      💰 ${price.id}: ${price.currency.toUpperCase()} ${amount}/${interval}`)
      }
    }
  }
  
  console.log('\n✨ Verificação concluída!')
}

checkSetup().catch(console.error)
