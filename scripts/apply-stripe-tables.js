#!/usr/bin/env node

/**
 * Script para aplicar as tabelas Stripe no Supabase
 * Execute com: node scripts/apply-stripe-tables.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false; // Tabela não existe
    }
    if (error && error.message.includes('406')) {
      return false; // Tabela não existe
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function runSQL(sql, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      // Se a função exec_sql não existe, tentamos via REST API
      console.log(`   ⚠️ Função RPC não disponível. Execute manualmente no SQL Editor do Supabase.`);
      return false;
    }
    console.log(`   ✅ Sucesso!`);
    return true;
  } catch (err) {
    console.log(`   ⚠️ Erro: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Verificando tabelas Stripe no Supabase...\n');

  // Verificar se as tabelas existem
  const stripeCustomersExists = await checkTableExists('stripe_customers');
  const stripeSubscriptionsExists = await checkTableExists('stripe_subscriptions');

  console.log(`📊 Status das tabelas:`);
  console.log(`   - stripe_customers: ${stripeCustomersExists ? '✅ Existe' : '❌ Não existe'}`);
  console.log(`   - stripe_subscriptions: ${stripeSubscriptionsExists ? '✅ Existe' : '❌ Não existe'}`);

  if (stripeCustomersExists && stripeSubscriptionsExists) {
    console.log('\n✅ Todas as tabelas Stripe já existem!');
    return;
  }

  console.log('\n⚠️ Algumas tabelas não existem. Execute o seguinte SQL no SQL Editor do Supabase Dashboard:\n');
  console.log('═'.repeat(80));
  console.log(`
-- Stripe Integration Tables

-- Table to store Stripe customers
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store Stripe subscriptions
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES stripe_customers(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    plan_id VARCHAR(255) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store Stripe payments
CREATE TABLE IF NOT EXISTS stripe_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES stripe_customers(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_stripe_id ON stripe_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_customer_id ON stripe_payments(customer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
DROP POLICY IF EXISTS "Users can view their own Stripe customer data" ON stripe_customers;
CREATE POLICY "Users can view their own Stripe customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own Stripe customer data" ON stripe_customers;
CREATE POLICY "Users can insert their own Stripe customer data" ON stripe_customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own Stripe customer data" ON stripe_customers;
CREATE POLICY "Users can update their own Stripe customer data" ON stripe_customers
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all customers" ON stripe_customers;
CREATE POLICY "Service role can manage all customers" ON stripe_customers
    FOR ALL USING (true);

-- RLS Policies for stripe_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON stripe_subscriptions
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM stripe_customers WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON stripe_subscriptions;
CREATE POLICY "Service role can manage all subscriptions" ON stripe_subscriptions
    FOR ALL USING (true);

-- RLS Policies for stripe_payments
DROP POLICY IF EXISTS "Users can view their own payments" ON stripe_payments;
CREATE POLICY "Users can view their own payments" ON stripe_payments
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM stripe_customers WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage all payments" ON stripe_payments;
CREATE POLICY "Service role can manage all payments" ON stripe_payments
    FOR ALL USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON stripe_customers TO authenticated;
GRANT SELECT ON stripe_subscriptions TO authenticated;
GRANT SELECT ON stripe_payments TO authenticated;
GRANT ALL PRIVILEGES ON stripe_customers TO service_role;
GRANT ALL PRIVILEGES ON stripe_subscriptions TO service_role;
GRANT ALL PRIVILEGES ON stripe_payments TO service_role;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_subscriptions_updated_at ON stripe_subscriptions;
CREATE TRIGGER update_stripe_subscriptions_updated_at
    BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`);
  console.log('═'.repeat(80));
  
  console.log('\n📝 Instruções:');
  console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em "SQL Editor"');
  console.log('4. Cole o SQL acima e execute');
  console.log('5. Reinicie sua aplicação\n');
}

main().catch(console.error);

