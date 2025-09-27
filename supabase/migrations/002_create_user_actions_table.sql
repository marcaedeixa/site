-- Criação da tabela para rastrear ações dos usuários
CREATE TABLE user_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_created_at ON user_actions(created_at);
CREATE INDEX idx_user_actions_user_action_date ON user_actions(user_id, action_type, created_at);

-- Habilitar RLS
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias ações" ON user_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir ações" ON user_actions
    FOR INSERT WITH CHECK (true);

-- Conceder permissões
GRANT ALL PRIVILEGES ON user_actions TO authenticated;
GRANT SELECT ON user_actions TO anon;

-- Função para limpar ações antigas (manter apenas últimos 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_user_actions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_actions 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ language 'plpgsql';

-- Função para obter estatísticas de uso do usuário
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    action_type VARCHAR,
    action_count BIGINT,
    last_action TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.action_type,
        COUNT(*) as action_count,
        MAX(ua.created_at) as last_action
    FROM user_actions ua
    WHERE ua.user_id = user_uuid 
    AND ua.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY ua.action_type
    ORDER BY action_count DESC;
END;
$$ language 'plpgsql';

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION cleanup_old_user_actions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage_stats(UUID, INTEGER) TO authenticated, anon;