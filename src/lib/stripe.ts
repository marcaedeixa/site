import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance (lazy initialization)
let _stripe: Stripe | null = null;

export const getServerStripe = (): Stripe => {
  if (typeof window !== 'undefined') {
    throw new Error('Server-side Stripe instance should not be used on the client side');
  }
  
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Stripe is disabled: STRIPE_SECRET_KEY not set');
    }

    _stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  
  return _stripe;
};

// Use getServerStripe() function instead of direct stripe export to avoid client-side initialization

// Client-side Stripe instance (optional)
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    // Stripe não está configurado para o cliente
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Stripe configuration constants
export const STRIPE_CONFIG = {
  mode: process.env.STRIPE_MODE || 'test',
  currency: 'brl',
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription/success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/plans`,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  trialDays: 7, // Período de teste gratuito
} as const;

// Stripe product and price configurations
export const STRIPE_PLANS = {
  basic: {
    name: 'Plano Básico',
    description: 'Ideal para começar a organizar suas marcações',
    features: [
      'Até 10 projetos',
      'Editor completo',
      'Exportação básica',
      'Suporte por email',
    ],
    prices: {
      monthly: {
        amount: 2990, // R$ 29,90 em centavos
        interval: 'month' as const,
        priceId: 'price_1SLHGERZnrK82RAyBnFueMkV',
      },
      yearly: {
        amount: 45099, // R$ 450,99 em centavos
        interval: 'year' as const,
        priceId: 'price_1SLGe1RZnrK82RAy4pnPa7aH',
      },
    },
  },
  premium: {
    name: 'Plano Premium',
    description: 'Acesso completo a todas as funcionalidades',
    features: [
      'Projetos ilimitados',
      'Editor avançado',
      'Exportação em alta qualidade',
      'Suporte prioritário',
      'Templates exclusivos',
      'Colaboração em equipe',
    ],
    prices: {
      monthly: {
        amount: 5990, // R$ 59,90 em centavos
        interval: 'month' as const,
        priceId: 'price_1SLHGFRZnrK82RAyJ9eyQbwO',
      },
      yearly: {
        amount: 59900, // R$ 599,00 em centavos
        interval: 'year' as const,
        priceId: 'price_1SLHGGRZnrK82RAyRidf20Su',
      },
    },
  },
} as const;

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'usd'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

// Helper function to get plan by price ID
export const getPlanByPriceId = (priceId: string) => {
  for (const [planKey, plan] of Object.entries(STRIPE_PLANS)) {
    for (const [intervalKey, price] of Object.entries(plan.prices)) {
      if (price.priceId === priceId) {
        return {
          planKey,
          intervalKey,
          plan,
          price,
        };
      }
    }
  }
  return null;
};

// Stripe webhook event types we handle
export const STRIPE_WEBHOOK_EVENTS = {
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
} as const;

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[keyof typeof STRIPE_WEBHOOK_EVENTS];