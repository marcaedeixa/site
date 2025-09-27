-- Criação do sistema de assinaturas
-- Tabela de planos de assinatura
CREATE TABLE subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2),
    duration_days INTEGER NOT NULL, -- 3 para teste, 30 para mensal, 365 para anual
    features JSONB DEFAULT '[]'::jsonb,
    is_trial BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de assinaturas dos usuários
CREATE TABLE user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, cancelled
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_trial BOOLEAN DEFAULT false,
    trial_used BOOLEAN DEFAULT false,
    auto_renew BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, plan_id, start_date)
);

-- Tabela de histórico de assinaturas
CREATE TABLE subscription_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, renewed, cancelled, expired, upgraded, downgraded
    old_plan_id UUID REFERENCES subscription_plans(id),
    new_plan_id UUID REFERENCES subscription_plans(id),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, duration_days, features, is_trial, is_active) VALUES
('Teste Gratuito', 'Acesso limitado por 3 dias para testar a plataforma', 0, NULL, 3, '["Funcionalidades básicas", "Suporte por email", "Limite de 10 ações por dia"]'::jsonb, true, true),
('Plano Básico', 'Plano mensal com funcionalidades essenciais', 29.90, 299.00, 30, '["Todas as funcionalidades básicas", "Suporte prioritário", "Limite de 100 ações por dia", "Relatórios básicos"]'::jsonb, false, true),
('Plano Premium', 'Plano completo com todas as funcionalidades', 59.90, 599.00, 30, '["Todas as funcionalidades", "Suporte 24/7", "Ações ilimitadas", "Relatórios avançados", "API access", "Integrações premium"]'::jsonb, false, true);

-- Habilitar RLS (Row Level Security)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para subscription_plans
CREATE POLICY "Planos são visíveis para todos" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Políticas de segurança para user_subscriptions
CREATE POLICY "Usuários podem ver suas próprias assinaturas" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias assinaturas" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias assinaturas" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas de segurança para subscription_history
CREATE POLICY "Usuários podem ver seu próprio histórico" ON subscription_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir no histórico" ON subscription_history
    FOR INSERT WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar assinatura de teste automática para novos usuários
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
    trial_plan_id UUID;
BEGIN
    -- Buscar o plano de teste
    SELECT id INTO trial_plan_id 
    FROM subscription_plans 
    WHERE is_trial = true AND is_active = true 
    LIMIT 1;
    
    -- Criar assinatura de teste se o plano existir
    IF trial_plan_id IS NOT NULL THEN
        INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date, is_trial, trial_used)
        VALUES (
            NEW.id,
            trial_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '3 days',
            true,
            true
        );
        
        -- Registrar no histórico
        INSERT INTO subscription_history (user_id, subscription_id, action, new_plan_id, details)
        VALUES (
            NEW.id,
            (SELECT id FROM user_subscriptions WHERE user_id = NEW.id AND plan_id = trial_plan_id ORDER BY created_at DESC LIMIT 1),
            'created',
            trial_plan_id,
            '{"type": "trial", "auto_created": true}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para criar assinatura de teste para novos usuários
CREATE TRIGGER create_trial_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();

-- Função para verificar se a assinatura está ativa
CREATE OR REPLACE FUNCTION is_subscription_active(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_subscription BOOLEAN := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = user_uuid 
        AND status = 'active' 
        AND end_date > NOW()
    ) INTO active_subscription;
    
    RETURN active_subscription;
END;
$$ language 'plpgsql';

-- Função para obter o plano ativo do usuário
CREATE OR REPLACE FUNCTION get_user_active_plan(user_uuid UUID)
RETURNS TABLE(
    subscription_id UUID,
    plan_id UUID,
    plan_name VARCHAR,
    features JSONB,
    is_trial BOOLEAN,
    end_date TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id as subscription_id,
        sp.id as plan_id,
        sp.name as plan_name,
        sp.features,
        us.is_trial,
        us.end_date,
        EXTRACT(DAY FROM (us.end_date - NOW()))::INTEGER as days_remaining
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active' 
    AND us.end_date > NOW()
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ language 'plpgsql';

-- Conceder permissões para as roles
GRANT SELECT ON subscription_plans TO anon, authenticated;
GRANT ALL PRIVILEGES ON user_subscriptions TO authenticated;
GRANT ALL PRIVILEGES ON subscription_history TO authenticated;
GRANT EXECUTE ON FUNCTION is_subscription_active(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_plan(UUID) TO anon, authenticated;