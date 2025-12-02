-- =============================================
-- Tabela para conteúdo da Landing Page
-- =============================================

CREATE TABLE IF NOT EXISTS landing_page_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section VARCHAR(100) NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índice para busca por seção
CREATE INDEX IF NOT EXISTS idx_landing_page_section ON landing_page_content(section);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_landing_page_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_landing_page_timestamp ON landing_page_content;
CREATE TRIGGER trigger_landing_page_timestamp
  BEFORE UPDATE ON landing_page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_landing_page_timestamp();

-- RLS Policies
ALTER TABLE landing_page_content ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (para a landing page)
CREATE POLICY "landing_page_content_select" ON landing_page_content
  FOR SELECT USING (true);

-- Apenas admins podem modificar (via service role)
CREATE POLICY "landing_page_content_admin" ON landing_page_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- =============================================
-- Dados iniciais da Landing Page
-- =============================================

INSERT INTO landing_page_content (section, content) VALUES
('hero', '{
  "badge": "Novo: Editor v2.0 disponível",
  "title_line1": "Crie histórias",
  "title_line2": "visuais",
  "title_line3": "incríveis",
  "description": "O editor mais intuitivo para criar apresentações, storyboards e narrativas interativas. Dê vida às suas ideias.",
  "cta_primary": "Começar Grátis",
  "cta_secondary": "Ver Demo",
  "social_proof_count": "+1.000",
  "social_proof_text": "criadores já estão usando"
}'::jsonb),

('about', '{
  "title": "Democratizamos a criação de conteúdo visual",
  "description": "Uma plataforma revolucionária que permite que qualquer pessoa crie narrativas profissionais sem conhecimento técnico.",
  "stats": [
    {"value": "1k+", "label": "Usuários ativos"},
    {"value": "50k+", "label": "Projetos criados"},
    {"value": "99%", "label": "Satisfação"}
  ],
  "cards": [
    {"title": "Simplicidade", "description": "Interface intuitiva para criar projetos complexos", "icon": "eye"},
    {"title": "Colaboração", "description": "Trabalhe em equipe com facilidade", "icon": "users"},
    {"title": "Profissional", "description": "Resultados de qualidade para sua audiência", "icon": "presentation"},
    {"title": "Inovação", "description": "Recursos avançados sempre atualizados", "icon": "sparkles"}
  ]
}'::jsonb),

('features', '{
  "title": "Tudo que você precisa",
  "description": "Ferramentas poderosas para criar narrativas visuais impressionantes",
  "items": [
    {"title": "Editor Visual", "description": "Interface drag-and-drop intuitiva para criar narrativas visuais sem complicação", "icon": "eye"},
    {"title": "Sistema de Atores", "description": "Gerencie personagens e elementos com facilidade e precisão", "icon": "users"},
    {"title": "Criação de Cenas", "description": "Organize sua narrativa em cenas sequenciais e dinâmicas", "icon": "layers"},
    {"title": "Apresentação", "description": "Apresente suas criações com transições suaves e profissionais", "icon": "presentation"},
    {"title": "Personalização", "description": "Customize cada detalhe do ambiente visual do seu projeto", "icon": "sparkles"},
    {"title": "Exportação", "description": "Salve e compartilhe suas criações em diversos formatos", "icon": "download"}
  ]
}'::jsonb),

('cta', '{
  "title": "Pronto para começar?",
  "description": "Junte-se a milhares de criadores que já estão transformando suas ideias em realidade.",
  "button_text": "Começar Agora — É Grátis"
}'::jsonb),

('footer', '{
  "description": "O editor visual mais intuitivo para criar narrativas e apresentações incríveis. Transforme suas ideias em experiências visuais envolventes.",
  "contact_email": "contato@marcaedeixa.com"
}'::jsonb),

('media', '{
  "hero_video_url": "",
  "hero_image_url": "",
  "demo_video_url": ""
}'::jsonb),

('links', '{
  "terms_url": "/termos",
  "privacy_url": "/privacidade",
  "support_url": "/suporte",
  "documentation_url": "/docs"
}'::jsonb)

ON CONFLICT (section) DO NOTHING;

