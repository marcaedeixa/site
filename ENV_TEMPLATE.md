# Configuração de Variáveis de Ambiente

Este arquivo contém um template para as variáveis de ambiente necessárias no projeto.

## Instruções

1. Crie um arquivo `.env.local` na raiz do projeto
2. Copie o conteúdo abaixo para o arquivo `.env.local`
3. Substitua os valores `your-*` pelas suas credenciais reais do Supabase

## Template .env.local

```env
# Supabase Configuration
# Obtenha estas credenciais em: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database (opcional, se precisar de conexão direta)
# Encontre em: https://app.supabase.com/project/_/settings/database
DATABASE_URL=your-database-connection-string

# Stripe (já configurado conforme STRIPE_SETUP.md)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Como obter as credenciais do Supabase

1. **NEXT_PUBLIC_SUPABASE_URL**: 
   - Acesse seu projeto no Supabase
   - Vá em Settings → API
   - Copie a "Project URL"

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - Na mesma página (Settings → API)
   - Copie a chave "anon public"

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - Na mesma página (Settings → API)
   - Copie a chave "service_role" (⚠️ mantenha esta chave segura!)

4. **DATABASE_URL** (opcional):
   - Vá em Settings → Database
   - Copie a "Connection string" no formato URI

## Notas Importantes

- ⚠️ **Nunca commite o arquivo `.env.local`** - ele já está no `.gitignore`
- As variáveis com prefixo `NEXT_PUBLIC_` são expostas no browser
- A `SUPABASE_SERVICE_ROLE_KEY` deve ser usada apenas no servidor
- Reinicie o servidor de desenvolvimento (`npm run dev`) após criar/modificar o `.env.local`
