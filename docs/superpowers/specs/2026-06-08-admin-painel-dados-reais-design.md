# Admin Painel — Dados Reais

**Data:** 2026-06-08  
**Escopo:** Substituir dados mockados no painel administrativo por dados reais do Supabase e Stripe.

---

## Contexto

O painel admin existe e está funcional em termos de UI, mas a página de clientes usa um array `mockCustomers` hardcoded com 5 registros fictícios. O dashboard já chama as APIs reais, mas tem fallbacks para dados simulados quando as APIs falham — e a API de stats tem um bug que impede os dados de chegarem corretamente.

### Estado atual das APIs

- `GET /api/admin/stats` — busca dados reais mas usa `from('auth.users')` que não funciona no Supabase (deveria usar `auth.admin.listUsers()`). `weeklyGrowth` é hardcoded em 12.5.
- `GET /api/admin/users` — funciona corretamente, retorna usuários reais via `auth.admin.listUsers()`, mas sem dados de assinatura ou gastos.
- `customers/page.tsx` — ignora completamente as APIs e usa `mockCustomers` local.

### Tabelas relevantes no banco

- `auth.users` — usuários reais (via Supabase Auth Admin SDK)
- `user_subscriptions` + `subscription_plans` — sistema interno de trial (3 dias automático para todo novo usuário)
- `stripe_customers` — clientes Stripe, referenciados por `user_id`
- `stripe_subscriptions` — assinaturas pagas, com `status` e `plan_name`
- `stripe_payments` — pagamentos realizados, com `amount` (centavos) e `status`

---

## Definição de Planos

| Categoria | Critério |
|-----------|----------|
| **Pago** | Tem linha em `stripe_subscriptions` com `status IN ('active', 'trialing')` |
| **Trial** | Tem linha em `user_subscriptions` com `is_trial = true`, `status = 'active'` e `end_date > now()` — e não é `paid` |
| **Gratuito** | Qualquer usuário que não se enquadra em `paid` nem `trial` |

---

## Arquitetura

Mudança **backend-first**: corrigir e expandir as APIs existentes. O frontend consome o que já existe — nenhuma nova página ou componente.

**Arquivos alterados:**
```
src/app/api/admin/stats/route.ts      → corrigir bug + adicionar contagens free/trial/paid + weeklyGrowth real
src/app/api/admin/users/route.ts      → adicionar subscription_status, plan_name, total_spent
src/app/admin/page.tsx                → adicionar 3 cards free/trial/paid
src/app/admin/customers/page.tsx      → substituir mockCustomers pela chamada real à API
```

Nenhuma migração de banco necessária.

---

## API: `GET /api/admin/stats`

### Resposta

```ts
{
  totalUsers: number,       // via auth.admin.listUsers()
  totalProjects: number,    // COUNT de projects
  activeUsers: number,      // last_sign_in_at >= 30 dias atrás
  todayLogins: number,      // last_sign_in_at >= hoje 00:00
  weeklyGrowth: number,     // % de crescimento: (novos últimos 7d - novos 7d anteriores) / 7d anteriores * 100
  freeUsers: number,        // totalUsers - trialUsers - paidUsers
  trialUsers: number,       // COUNT user_subscriptions WHERE is_trial=true AND status='active' AND end_date > now()
  paidUsers: number,        // COUNT stripe_subscriptions WHERE status IN ('active','trialing')
  systemStatus: 'operational' | 'error'
}
```

### Correção do bug

Substituir `supabaseAdmin.from('auth.users')` por `supabaseAdmin.auth.admin.listUsers()` para todas as contagens de usuários. A abordagem atual falha silenciosamente e retorna 0.

### Cálculo de weeklyGrowth

```
thisWeek  = COUNT auth.users WHERE created_at >= 7 dias atrás
lastWeek  = COUNT auth.users WHERE created_at >= 14 dias atrás AND < 7 dias atrás
weeklyGrowth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100) : 0
```

---

## API: `GET /api/admin/users`

### Parâmetros (sem mudança)

- `limit` (default: 10)
- `offset` (default: 0)

### Resposta expandida

```ts
{
  users: [{
    id: string,
    email: string,
    created_at: string,
    last_sign_in_at: string | null,
    subscription_status: 'free' | 'trial' | 'paid',
    plan_name: string | null,    // ex: "Plano Premium"; null se free ou trial
    total_spent: number,         // soma em centavos; 0 se sem pagamentos
  }],
  total: number,
  limit: number,
  offset: number
}
```

### Lógica de enriquecimento (server-side)

1. `auth.admin.listUsers({ page, perPage })` → lista de usuários com IDs
2. Extrair array de `userIds`
3. Query `stripe_customers` WHERE `user_id IN (userIds)` → mapa `userId → stripe_customer_id` e `customerId (interno)`
4. Query `stripe_subscriptions` WHERE `customer_id IN (customerIds internos)` AND `status IN ('active', 'trialing')` → mapa `customerId → {status, plan_name}`
5. Query `user_subscriptions` WHERE `user_id IN (userIds)` AND `is_trial = true` AND `status = 'active'` AND `end_date > now()` → set de `userIds` em trial
6. Query `stripe_payments` WHERE `customer_id IN (customerIds internos)` AND `status = 'succeeded'` → `SUM(amount)` agrupado por `customer_id`
7. Montar cada usuário:
   - Se tem stripe subscription ativa → `paid`, `plan_name` do Stripe
   - Else se está no set de trial → `trial`, `plan_name = null`
   - Else → `free`, `plan_name = null`
   - `total_spent` = soma dos pagamentos, ou 0

Todas as queries usam `service role`. Se não há clientes Stripe para o batch, pular as queries 3–6 e marcar todos como free/trial conforme passo 5.

---

## UI: Dashboard (`/admin/page.tsx`)

Adicionar uma segunda linha de cards abaixo das 4 métricas existentes:

```
[Gratuitos]   [Em Trial]   [Pagos]
```

- **Gratuitos** — ícone `UserMinus`, fundo cinza, valor `stats.freeUsers`
- **Em Trial** — ícone `Clock`, fundo azul, valor `stats.trialUsers`
- **Pagos** — ícone `CreditCard`, fundo verde, valor `stats.paidUsers`

Nenhuma outra mudança no dashboard — o restante já funciona com dados reais quando a API funcionar corretamente.

---

## UI: Lista de Clientes (`/admin/customers/page.tsx`)

### Substituição dos dados

Remover `mockCustomers`. A função `loadCustomers` passa a chamar `GET /api/admin/users?limit=50&offset=0` e mapear a resposta para o tipo `Customer` existente:

```ts
const customer: Customer = {
  id: user.id,
  email: user.email,
  full_name: undefined,                  // não disponível na API — exibir email como fallback
  created_at: user.created_at,
  last_sign_in_at: user.last_sign_in_at,
  is_active: true,                       // todos os usuários retornados são ativos
  subscription_status: user.subscription_status,
  total_projects: 0,                     // não disponível nessa fase — exibir "—"
  total_spent: user.total_spent / 100,   // converter centavos para reais
  last_activity: user.last_sign_in_at ?? user.created_at
}
```

> **Nota:** `full_name` e `total_projects` não estão disponíveis na API nessa fase. `full_name` exibe o email como fallback (já tratado no JSX existente). `total_projects` exibe "—" para não passar a impressão de que todos têm 0 projetos.

### Badges de status (atualização de cores)

| Status | Badge | Cor |
|--------|-------|-----|
| `paid` | Pago | verde |
| `trial` | Trial | azul |
| `free` | Gratuito | cinza |

### Cards de estatísticas no topo

Os 6 cards existentes continuam, mas `trialCustomers` e `activeCustomers` passam a ser calculados com base nos dados reais retornados (não mais do mock). `totalRevenue` usa `SUM(total_spent)` sobre os registros carregados.

### Paginação

Manter a paginação client-side existente. O endpoint já suporta `limit/offset` mas para simplificar carregar um batch inicial de 50 usuários e paginar no frontend — suficiente para o volume atual.

---

## O que não muda

- Filtros por status e assinatura
- Modal de detalhes do cliente
- Export CSV
- Ações (ativar/desativar/excluir) — continuam operando só no estado local por ora
- Autenticação e verificação de admin

---

## Fora de escopo

- `total_projects` por usuário (requer query adicional na tabela `projects` por `user_id` — pode ser adicionado em seguida)
- `full_name` do perfil do usuário (requer tabela de profiles ou `user_metadata`)
- Ações reais de ativar/desativar/excluir no banco
