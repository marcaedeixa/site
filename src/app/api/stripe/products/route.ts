import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const stripe = await getServerStripe()
    
    // Buscar produtos do Stripe
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    })

    // Buscar preços
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    })

    return NextResponse.json({
      products: products.data,
      prices: prices.data
    })
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produtos do Stripe' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    let action = 'sync' // default action
    
    // Try to parse JSON, but don't fail if empty
    try {
      const body = await request.json()
      action = body.action || 'sync'
    } catch {
      // If no JSON body, use default action
    }

    if (action === 'sync') {
      return await syncProducts()
    }

    return NextResponse.json(
      { error: 'Ação não reconhecida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro na API de produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function syncProducts() {
  try {
    const stripe = await getServerStripe()
    const supabase = await createClient(true) // service role

    // Produtos padrão para sincronizar
    type RecurringInterval = 'month' | 'year'
    type ProductPrice = {
      unit_amount: number
      currency: string
      recurring: { interval: RecurringInterval }
      nickname: string
    }
    type ProductConfig = {
      name: string
      description: string
      prices: ProductPrice[]
    }

    const defaultProducts: ProductConfig[] = [
      {
        name: 'Plano Básico',
        description: 'Acesso às funcionalidades básicas da plataforma',
        prices: [
          {
            unit_amount: 2990, // R$ 29,90
            currency: 'brl',
            recurring: { interval: 'month' },
            nickname: 'Básico Mensal'
          },
          {
            unit_amount: 45099,
            currency: 'brl',
            recurring: { interval: 'year' },
            nickname: 'Básico Anual'
          }
        ]
      },
      {
        name: 'Plano Premium',
        description: 'Acesso completo a todas as funcionalidades',
        prices: [
          {
            unit_amount: 5990, // R$ 59,90
            currency: 'brl',
            recurring: { interval: 'month' },
            nickname: 'Premium Mensal'
          },
          {
            unit_amount: 59900, // R$ 599,00 (10 meses pelo preço de 12)
            currency: 'brl',
            recurring: { interval: 'year' },
            nickname: 'Premium Anual'
          }
        ]
      }
    ]

    const syncedProducts = []

    for (const productData of defaultProducts) {
      // Verificar se o produto já existe
      const existingProducts = await stripe.products.list({
        active: true
      })
      
      let product = existingProducts.data.find(p => p.name === productData.name)
      
        if (!product) {
          product = await stripe.products.create({
            name: productData.name,
            description: productData.description,
            active: true,
            metadata: {
              plan_key: productData.name.toLowerCase().includes('básico') ? 'basic' : 'premium'
            }
          })
        }

      // Criar preços se não existirem
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true
      })

      for (const priceData of productData.prices) {
        const existingPrice = existingPrices.data.find(p => 
          p.unit_amount === priceData.unit_amount &&
          p.currency === priceData.currency &&
          p.recurring?.interval === priceData.recurring.interval
        )

        if (!existingPrice) {
          await stripe.prices.create({
            product: product.id,
            unit_amount: priceData.unit_amount,
            currency: priceData.currency,
            recurring: priceData.recurring,
            nickname: priceData.nickname
          })
        }
      }

      syncedProducts.push({
        id: product.id,
        name: product.name,
        description: product.description
      })
    }

    // Atualizar tabela de planos local
    for (const product of syncedProducts) {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true
      })

      for (const price of prices.data) {
        await supabase
          .from('subscription_plans')
          .upsert({
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            name: product.name,
            description: product.description,
            price: price.unit_amount ? price.unit_amount / 100 : 0,
            currency: price.currency,
            interval: price.recurring?.interval || 'month',
            is_active: true
          }, {
            onConflict: 'stripe_price_id'
          })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Produtos sincronizados com sucesso',
      products: syncedProducts
    })
  } catch (error) {
    console.error('Erro ao sincronizar produtos:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar produtos' },
      { status: 500 }
    )
  }
}
