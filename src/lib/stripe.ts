import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance (lazy initialization)
let _stripe: Stripe | null = null;

export const getServerStripe = (): Stripe => {
  if (typeof window !== 'undefined') {
    throw new Error('Server-side Stripe instance should not be used on the client side');
  }
  
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  
  return _stripe;
};

// Use getServerStripe() function instead of direct stripe export to avoid client-side initialization

// Client-side Stripe instance
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
}

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Stripe configuration constants
export const STRIPE_CONFIG = {
  mode: process.env.STRIPE_MODE || 'test',
  currency: 'usd',
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/subscription/success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing`,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
} as const;

// Stripe product and price configurations
export const STRIPE_PLANS = {
  basic: {
    name: 'Plano Básico',
    description: 'Acesso a funcionalidades básicas',
    features: [
      'Até 10 projetos',
      'Suporte por email',
      'Dashboard básico',
      'Relatórios mensais'
    ],
    prices: {
      monthly: {
        amount: 1999, // $19.99 in cents
        interval: 'month' as const,
        priceId: 'price_basic_monthly', // Will be replaced with actual Stripe price ID
      },
      yearly: {
        amount: 19999, // $199.99 in cents (2 months free)
        interval: 'year' as const,
        priceId: 'price_basic_yearly', // Will be replaced with actual Stripe price ID
      },
    },
  },
  premium: {
    name: 'Plano Premium',
    description: 'Acesso completo a todas as funcionalidades',
    features: [
      'Projetos ilimitados',
      'Suporte prioritário',
      'Dashboard avançado',
      'Relatórios em tempo real',
      'API access',
      'Integrações avançadas'
    ],
    prices: {
      monthly: {
        amount: 4999, // $49.99 in cents
        interval: 'month' as const,
        priceId: 'price_premium_monthly', // Will be replaced with actual Stripe price ID
      },
      yearly: {
        amount: 49999, // $499.99 in cents (2 months free)
        interval: 'year' as const,
        priceId: 'price_premium_yearly', // Will be replaced with actual Stripe price ID
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