import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeJs } from '@stripe/stripe-js';
import { PLANS } from '@/lib/plan-config';

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
      apiVersion: '2024-06-20',
      typescript: true,
    });
  }
  
  return _stripe;
};

// Use getServerStripe() function instead of direct stripe export to avoid client-side initialization

// Client-side Stripe instance (optional)
let stripePromise: Promise<StripeJs | null> | null = null;

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
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()

export const STRIPE_CONFIG = {
  mode: process.env.STRIPE_MODE || 'test',
  currency: 'brl',
  successUrl: `${APP_URL}/dashboard/subscription/success`,
  cancelUrl: `${APP_URL}/plans`,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  trialDays: 0, // Sem trial — plano gratuito é permanente
} as const;

// Stripe product and price configurations — alinhados com plan-config.ts
export const STRIPE_PLANS = {
  // Plano Pro (único plano pago)
  pro: {
    name: PLANS.pro.name,
    description: PLANS.pro.description,
    features: PLANS.pro.features,
    prices: {
      monthly: {
        amount: PLANS.pro.prices!.monthly.amount, // R$ 5,00 em centavos
        interval: 'month' as const,
      },
      yearly: {
        amount: PLANS.pro.prices!.yearly.amount, // R$ 50,00 em centavos
        interval: 'year' as const,
      },
    },
  },
  // Aliases para compatibilidade (mapeiam para pro)
  basic: {
    name: PLANS.pro.name,
    description: PLANS.pro.description,
    features: PLANS.pro.features,
    prices: {
      monthly: {
        amount: PLANS.pro.prices!.monthly.amount,
        interval: 'month' as const,
      },
      yearly: {
        amount: PLANS.pro.prices!.yearly.amount,
        interval: 'year' as const,
      },
    },
  },
  premium: {
    name: PLANS.pro.name,
    description: PLANS.pro.description,
    features: PLANS.pro.features,
    prices: {
      monthly: {
        amount: PLANS.pro.prices!.monthly.amount,
        interval: 'month' as const,
      },
      yearly: {
        amount: PLANS.pro.prices!.yearly.amount,
        interval: 'year' as const,
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

const mapPlanKeyFromName = (name?: string | null) => {
  if (!name) return null;
  const normalized = name.toLowerCase();
  if (normalized.includes('pro') || normalized.includes('básico') || normalized.includes('basic') || normalized.includes('premium')) return 'pro';
  return null;
};

export const getPlanByPriceId = async (priceId: string) => {
  if (!priceId) return null;
  try {
    const stripe = getServerStripe();
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const product = price.product && typeof price.product !== 'string' ? price.product : null;
    const productName = product && !('deleted' in product) ? product.name : null;
    const planKey = mapPlanKeyFromName(productName);
    const plan = planKey ? STRIPE_PLANS[planKey] : null;

    return {
      planKey,
      plan,
      price,
      productName,
    };
  } catch (error) {
    console.error('Error resolving plan by price ID:', error);
    return null;
  }
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
