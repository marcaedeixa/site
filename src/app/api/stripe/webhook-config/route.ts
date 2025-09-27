import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'

export async function GET() {
  try {
    const stripe = await getServerStripe()
    
    // Listar webhooks existentes
    const webhooks = await stripe.webhookEndpoints.list()
    
    return NextResponse.json({
      success: true,
      webhooks: webhooks.data.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        enabled_events: webhook.enabled_events,
        status: webhook.status,
        created: webhook.created
      }))
    })
  } catch (error) {
    console.error('Erro ao listar webhooks:', error)
    return NextResponse.json(
      { error: 'Erro ao listar webhooks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, url } = await request.json()
    const stripe = await getServerStripe()
    
    if (action === 'create') {
      // Criar novo webhook
      const webhook = await stripe.webhookEndpoints.create({
        url: url || `${process.env.NEXTAUTH_URL}/api/stripe/webhooks`,
        enabled_events: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed',
          'customer.created',
          'customer.updated',
          'payment_intent.succeeded',
          'payment_intent.payment_failed'
        ]
      })
      
      return NextResponse.json({
        success: true,
        webhook: {
          id: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          enabled_events: webhook.enabled_events
        },
        message: 'Webhook criado com sucesso'
      })
    }
    
    return NextResponse.json(
      { error: 'Ação não reconhecida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro ao configurar webhook:', error)
    return NextResponse.json(
      { error: 'Erro ao configurar webhook' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')
    
    if (!webhookId) {
      return NextResponse.json(
        { error: 'ID do webhook é obrigatório' },
        { status: 400 }
      )
    }
    
    const stripe = await getServerStripe()
    await stripe.webhookEndpoints.del(webhookId)
    
    return NextResponse.json({
      success: true,
      message: 'Webhook removido com sucesso'
    })
  } catch (error) {
    console.error('Erro ao remover webhook:', error)
    return NextResponse.json(
      { error: 'Erro ao remover webhook' },
      { status: 500 }
    )
  }
}