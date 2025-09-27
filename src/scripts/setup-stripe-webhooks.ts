/**
 * Script para configurar webhooks do Stripe
 * 
 * Este script ajuda a configurar os webhooks necessários para o Stripe
 * funcionar corretamente com a aplicação.
 * 
 * Para executar:
 * npx ts-node src/scripts/setup-stripe-webhooks.ts
 */

import { getServerStripe, STRIPE_WEBHOOK_EVENTS } from '../lib/stripe'

// URL do webhook (ajuste conforme necessário)
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhooks`
  : 'http://localhost:3000/api/stripe/webhooks'

// Eventos que queremos escutar
const WEBHOOK_EVENTS = [
  STRIPE_WEBHOOK_EVENTS.CUSTOMER_CREATED,
  STRIPE_WEBHOOK_EVENTS.CUSTOMER_UPDATED,
  STRIPE_WEBHOOK_EVENTS.CUSTOMER_DELETED,
  STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED,
  STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED,
  STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_DELETED,
  STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED,
  STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED,
  STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED,
  STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED,
]

async function setupWebhooks() {
  try {
    console.log('🔧 Configurando webhooks do Stripe...')
    console.log(`📡 URL do webhook: ${WEBHOOK_URL}`)
    
    // Listar webhooks existentes
    const existingWebhooks = await getServerStripe().webhookEndpoints.list()
    console.log(`📋 Webhooks existentes: ${existingWebhooks.data.length}`)
    
    // Verificar se já existe um webhook para nossa URL
    const existingWebhook = existingWebhooks.data.find(
      webhook => webhook.url === WEBHOOK_URL
    )
    
    if (existingWebhook) {
      console.log('✅ Webhook já existe:')
      console.log(`   ID: ${existingWebhook.id}`)
      console.log(`   Status: ${existingWebhook.status}`)
      console.log(`   Eventos: ${existingWebhook.enabled_events.length}`)
      
      // Atualizar eventos se necessário
      const missingEvents = WEBHOOK_EVENTS.filter(
        event => !existingWebhook.enabled_events.includes(event)
      )
      
      if (missingEvents.length > 0) {
        console.log(`🔄 Atualizando webhook com ${missingEvents.length} novos eventos...`)
        
        const updatedWebhook = await getServerStripe().webhookEndpoints.update(
          existingWebhook.id,
          {
            enabled_events: WEBHOOK_EVENTS,
          }
        )
        
        console.log('✅ Webhook atualizado com sucesso!')
        console.log(`   Eventos configurados: ${updatedWebhook.enabled_events.length}`)
      } else {
        console.log('✅ Webhook já está configurado corretamente!')
      }
      
      return existingWebhook
    }
    
    // Criar novo webhook
    console.log('🆕 Criando novo webhook...')
    
    const webhook = await getServerStripe().webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: 'Webhook para aplicação Next.js',
    })
    
    console.log('✅ Webhook criado com sucesso!')
    console.log(`   ID: ${webhook.id}`)
    console.log(`   Secret: ${webhook.secret}`)
    console.log(`   Eventos: ${webhook.enabled_events.length}`)
    
    console.log('\n📝 IMPORTANTE:')
    console.log('   Adicione o seguinte ao seu arquivo .env:')
    console.log(`   STRIPE_WEBHOOK_SECRET=${webhook.secret}`)
    
    return webhook
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhooks:', error)
    throw error
  }
}

async function listWebhooks() {
  try {
    console.log('📋 Listando todos os webhooks...')
    
    const webhooks = await getServerStripe().webhookEndpoints.list()
    
    if (webhooks.data.length === 0) {
      console.log('   Nenhum webhook encontrado.')
      return
    }
    
    webhooks.data.forEach((webhook, index) => {
      console.log(`\n${index + 1}. Webhook ID: ${webhook.id}`)
      console.log(`   URL: ${webhook.url}`)
      console.log(`   Status: ${webhook.status}`)
      console.log(`   Criado: ${new Date(webhook.created * 1000).toLocaleString()}`)
      console.log(`   Eventos: ${webhook.enabled_events.length}`)
      console.log(`   Descrição: ${webhook.description || 'N/A'}`)
    })
    
  } catch (error) {
    console.error('❌ Erro ao listar webhooks:', error)
    throw error
  }
}

async function deleteWebhook(webhookId: string) {
  try {
    console.log(`🗑️ Deletando webhook ${webhookId}...`)
    
    await getServerStripe().webhookEndpoints.del(webhookId)
    
    console.log('✅ Webhook deletado com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao deletar webhook:', error)
    throw error
  }
}

// Função principal
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'setup':
      await setupWebhooks()
      break
      
    case 'list':
      await listWebhooks()
      break
      
    case 'delete':
      const webhookId = process.argv[3]
      if (!webhookId) {
        console.error('❌ ID do webhook é obrigatório para deletar')
        console.log('   Uso: npm run stripe:webhook delete <webhook_id>')
        process.exit(1)
      }
      await deleteWebhook(webhookId)
      break
      
    default:
      console.log('🔧 Script de configuração de webhooks do Stripe')
      console.log('\nComandos disponíveis:')
      console.log('  setup  - Configura webhooks automaticamente')
      console.log('  list   - Lista todos os webhooks')
      console.log('  delete - Deleta um webhook específico')
      console.log('\nExemplos:')
      console.log('  npm run stripe:webhook setup')
      console.log('  npm run stripe:webhook list')
      console.log('  npm run stripe:webhook delete we_1234567890')
      break
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}

export { setupWebhooks, listWebhooks, deleteWebhook }