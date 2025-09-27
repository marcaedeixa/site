# Sistema Administrativo - Marca e Deixa

## 🔐 Acesso Administrativo

### Credenciais Padrão

**URL de Acesso:** [http://localhost:3001/admin/login](http://localhost:3001/admin/login)

**Credenciais:**
- **Email:** `admin@marcaedeixa.com`
- **Senha:** `Admin123!`
- **Role:** `super_admin`

---

## 🛡️ Segurança

### ⚠️ IMPORTANTE - Primeira Configuração

1. **Altere a senha padrão imediatamente** após o primeiro acesso
2. **Configure reCAPTCHA** para proteção adicional
3. **Mantenha as credenciais seguras** e não as compartilhe
4. **Use conexão HTTPS** em produção

### 🔒 Recursos de Segurança Implementados

- ✅ Hash de senha com bcrypt (12 salt rounds)
- ✅ Proteção contra força bruta (rate limiting)
- ✅ Logs de acesso administrativo
- ✅ Middleware de proteção de rotas
- ✅ Verificação de permissões em tempo real
- ✅ Sessões seguras
- ✅ RLS (Row Level Security) no banco

---

## 📋 Funcionalidades Administrativas

### 🏠 Dashboard Principal
- Métricas em tempo real
- Status do sistema
- Estatísticas de usuários e projetos
- Monitoramento de conectividade

### 👥 Gerenciamento de Clientes
**Rota:** `/admin/customers`
- Lista paginada de todos os usuários
- Filtros e busca avançada
- Visualização de perfis completos
- Histórico de projetos por usuário
- Status de assinatura/pagamento
- Ações: ativar/desativar, resetar senha
- Exportação de dados CSV
- Métricas e analytics

### ⚙️ Configurações do Sistema

#### 💳 Configuração do Stripe
**Rota:** `/admin/settings/stripe`
- Configuração de chaves (dev/prod)
- Teste de conectividade
- Gerenciamento de webhooks
- Dashboard de produtos e preços
- Histórico de transações

#### 🗄️ Configuração do Supabase
**Rota:** `/admin/settings/supabase`
- Configuração de URL e chaves
- Teste de conectividade
- Estatísticas do banco de dados
- Monitoramento de tabelas
- Status de migrations

### 📊 Logs e Auditoria
- Logs de acesso administrativo
- Histórico de ações
- Monitoramento de segurança
- Relatórios de atividade

---

## 🚀 Como Usar

### 1. Primeiro Acesso

1. Acesse [http://localhost:3001/admin/login](http://localhost:3001/admin/login)
2. Digite as credenciais padrão:
   - Email: `admin@marcaedeixa.com`
   - Senha: `Admin123!`
3. Complete o reCAPTCHA
4. **ALTERE A SENHA IMEDIATAMENTE**

### 2. Navegação

- **Dashboard:** Visão geral do sistema
- **Clientes:** Gerenciamento de usuários
- **Configurações:** Stripe e Supabase
- **Logs:** Auditoria e monitoramento

### 3. Gerenciamento de Usuários

1. Vá para `/admin/customers`
2. Use filtros para encontrar usuários específicos
3. Clique em um usuário para ver detalhes
4. Use as ações disponíveis conforme necessário

### 4. Configuração de Serviços

#### Stripe:
1. Vá para `/admin/settings/stripe`
2. Configure as chaves de API
3. Teste a conectividade
4. Configure webhooks se necessário

#### Supabase:
1. Vá para `/admin/settings/supabase`
2. Verifique as configurações
3. Monitore o status das tabelas
4. Acompanhe as migrations

---

## 🔧 Manutenção

### Criar Novos Usuários Administrativos

```bash
# Execute o script de criação
node scripts/create-admin-user.js
```

### Verificar Logs de Segurança

```sql
-- Consultar logs de acesso
SELECT * FROM admin_access_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

### Resetar Senha de Usuário Admin

```sql
-- Resetar tentativas de login
UPDATE admin_users 
SET login_attempts = 0, locked_until = NULL 
WHERE email = 'admin@marcaedeixa.com';
```

---

## 🆘 Solução de Problemas

### Não Consigo Fazer Login

1. **Verifique as credenciais:**
   - Email: `admin@marcaedeixa.com`
   - Senha: `Admin123!`

2. **Conta bloqueada:**
   - Execute o script de reset de tentativas
   - Aguarde o tempo de bloqueio expirar

3. **reCAPTCHA não funciona:**
   - Verifique a configuração das chaves
   - Teste em modo de desenvolvimento

### Erro de Conectividade

1. **Supabase:**
   - Verifique as variáveis de ambiente
   - Teste a conectividade na página de configurações

2. **Stripe:**
   - Verifique as chaves de API
   - Teste em modo sandbox primeiro

### Performance Lenta

1. **Verifique os índices do banco**
2. **Monitore os logs de consulta**
3. **Otimize filtros e paginação**

---

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema administrativo:

- **Email:** suporte@marcaedeixa.com
- **Documentação:** Este arquivo README-ADMIN.md
- **Logs:** Consulte `/admin/logs` para auditoria

---

## 🔄 Atualizações

**Versão:** 1.0.0  
**Última Atualização:** Janeiro 2025  
**Próximas Funcionalidades:**
- Dashboard de analytics avançado
- Notificações em tempo real
- Backup automático de configurações
- API de administração

---

**⚠️ LEMBRE-SE: Mantenha sempre as credenciais seguras e altere a senha padrão!**