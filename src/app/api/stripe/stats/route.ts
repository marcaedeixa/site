import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerStripe } from '@/lib/stripe'

export async function GET() {
  try {
    const supabase = await createClient(true) // service role
    const stripe = await getServerStripe()

    // Buscar estatísticas do banco local
    const { data: customers } = await supabase
      .from('stripe_customers')
      .select('*')

    const { data: subscriptions } = await supabase
      .from('stripe_subscriptions')
      .select('*')

    const { data: payments } = await supabase
      .from('stripe_payments')
      .select('*')

    // Calcular estatísticas
    const totalCustomers = customers?.length || 0
    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0
    const trialSubscriptions = subscriptions?.filter(s => s.status === 'trialing').length || 0
    const failedPayments = payments?.filter(p => p.status === 'failed').length || 0

    // Calcular receita total
    const totalRevenue = payments
      ?.filter(p => p.status === 'succeeded')
      ?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Calcular receita mensal (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const monthlyRevenue = payments
      ?.filter(p => 
        p.status === 'succeeded' && 
        new Date(p.created_at) >= thirtyDaysAgo
      )
      ?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Se não temos dados locais, tentar buscar do Stripe diretamente
    let stripeStats = {
      totalCustomers: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      failedPayments: 0,
      trialSubscriptions: 0
    }

    try {
      // Buscar clientes do Stripe
      const stripeCustomers = await stripe.customers.list({ limit: 100 })
      
      // Buscar assinaturas do Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({ limit: 100 })
      
      // Buscar pagamentos recentes do Stripe
      const stripePayments = await stripe.paymentIntents.list({ 
        limit: 100,
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000)
        }
      })

      stripeStats = {
        totalCustomers: stripeCustomers.data.length,
        activeSubscriptions: stripeSubscriptions.data.filter(s => s.status === 'active').length,
        trialSubscriptions: stripeSubscriptions.data.filter(s => s.status === 'trialing').length,
        failedPayments: stripePayments.data.filter(p => p.status === 'payment_failed').length,
        totalRevenue: stripePayments.data
          .filter(p => p.status === 'succeeded')
          .reduce((sum, p) => sum + (p.amount || 0), 0) / 100, // Converter de centavos
        monthlyRevenue: stripePayments.data
          .filter(p => p.status === 'succeeded')
          .reduce((sum, p) => sum + (p.amount || 0), 0) / 100 // Converter de centavos
      }
    } catch (stripeError) {
      console.warn('Erro ao buscar dados do Stripe:', stripeError)
    }

    // Usar dados locais se disponíveis, senão usar dados do Stripe
    const stats = {
      totalCustomers: totalCustomers > 0 ? totalCustomers : stripeStats.totalCustomers,
      activeSubscriptions: activeSubscriptions > 0 ? activeSubscriptions : stripeStats.activeSubscriptions,
      totalRevenue: totalRevenue > 0 ? totalRevenue / 100 : stripeStats.totalRevenue,
      monthlyRevenue: monthlyRevenue > 0 ? monthlyRevenue / 100 : stripeStats.monthlyRevenue,
      failedPayments: failedPayments > 0 ? failedPayments : stripeStats.failedPayments,
      trialSubscriptions: trialSubscriptions > 0 ? trialSubscriptions : stripeStats.trialSubscriptions
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      {
        totalCustomers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        failedPayments: 0,
        trialSubscriptions: 0
      },
      { status: 500 }
    )
  }
}