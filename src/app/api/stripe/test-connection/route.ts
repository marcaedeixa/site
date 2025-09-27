import { NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'

export async function GET() {
  try {
    const stripe = await getServerStripe()
    
    // Testar conexão fazendo uma chamada simples
    const account = await stripe.accounts.retrieve()
    
    // Verificar se as chaves estão configuradas corretamente
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
    
    return NextResponse.json({
      success: true,
      connected: true,
      account: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        email: account.email,
        type: account.type
      },
      mode: isTestMode ? 'test' : 'live',
      message: 'Conexão com Stripe estabelecida com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao testar conexão com Stripe:', error)
    
    let errorMessage = 'Erro desconhecido'
    let errorCode = 'unknown'
    
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Chave de API inválida'
      errorCode = 'invalid_api_key'
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Erro de conexão com Stripe'
      errorCode = 'connection_error'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: errorMessage,
        error_code: errorCode,
        message: 'Falha ao conectar com Stripe'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  // Mesmo comportamento do GET para compatibilidade
  return GET()
}