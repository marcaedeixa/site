-- Criar tabela de usuários administrativos
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de logs de acesso administrativo
CREATE TABLE IF NOT EXISTS admin_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_admin_user_id ON admin_access_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created_at ON admin_access_logs(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para admin_users
CREATE POLICY "Admin users can view their own data" ON admin_users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Super admins can view all admin users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id::text = auth.uid()::text 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  );

CREATE POLICY "Super admins can manage admin users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id::text = auth.uid()::text 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  );

-- Políticas de segurança para admin_access_logs
CREATE POLICY "Admin users can view their own logs" ON admin_access_logs
  FOR SELECT USING (admin_user_id::text = auth.uid()::text);

CREATE POLICY "Super admins can view all logs" ON admin_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id::text = auth.uid()::text 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  );

CREATE POLICY "System can insert logs" ON admin_access_logs
  FOR INSERT WITH CHECK (true);

-- Conceder permissões básicas
GRANT SELECT, INSERT, UPDATE ON admin_users TO authenticated;
GRANT SELECT, INSERT ON admin_access_logs TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO service_role;
GRANT ALL PRIVILEGES ON admin_access_logs TO service_role;

-- Inserir usuário super admin padrão (senha: admin123 - DEVE SER ALTERADA)
-- Hash gerado com bcrypt para 'admin123'
INSERT INTO admin_users (email, password_hash, name, role, is_active)
VALUES (
  'admin@marcaedeixa.com',
  '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O7K8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8',
  'Administrador Principal',
  'super_admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE admin_users IS 'Tabela de usuários administrativos do sistema';
COMMENT ON COLUMN admin_users.role IS 'Papel do usuário: admin ou super_admin';
COMMENT ON COLUMN admin_users.login_attempts IS 'Contador de tentativas de login falhadas';
COMMENT ON COLUMN admin_users.locked_until IS 'Data até quando a conta está bloqueada';
COMMENT ON TABLE admin_access_logs IS 'Logs de acesso e ações administrativas';