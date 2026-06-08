# Admin Painel — Dados Reais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir dados mockados do painel administrativo por dados reais do Supabase e Stripe, com separação clara de usuários gratuitos, trial e pagos.

**Architecture:** Backend-first: corrigir e expandir duas API routes existentes (`/api/admin/stats` e `/api/admin/users`), depois atualizar as duas páginas de frontend que as consomem. Nenhuma migração de banco necessária — todas as tabelas já existem.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Auth Admin SDK + service role), Stripe (tabelas espelhadas no Supabase)

---

## File Map

| Arquivo | O que muda |
|---------|-----------|
| `src/app/api/admin/stats/route.ts` | Reescrita completa: corrige bug `from('auth.users')`, adiciona contagens reais de free/trial/paid, weeklyGrowth real |
| `src/app/api/admin/users/route.ts` | Expande resposta: adiciona `subscription_status`, `plan_name`, `total_spent` por usuário |
| `src/app/admin/page.tsx` | Adiciona 3 cards (Gratuitos / Em Trial / Pagos) + imports novos |
| `src/app/admin/customers/page.tsx` | Remove `mockCustomers`, chama API real, atualiza badges e exibição de `total_projects` |

---

## Task 1: Corrigir e expandir `/api/admin/stats`

**Files:**
- Modify: `src/app/api/admin/stats/route.ts`

### Contexto

O arquivo atual faz `supabaseAdmin.from('auth.users')` que falha silenciosamente no Supabase (tabela `auth.users` não é exposta via PostgREST). O resultado é que todas as contagens de usuários retornam 0. Também tem `weeklyGrowth: 12.5` hardcoded.

A correção usa `supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })` para buscar até 1000 usuários e filtrar em memória para contagens de atividade. Para contagens de trial/paid, usa queries diretas nas tabelas públicas (`user_subscriptions`, `stripe_subscriptions`).

- [ ] **Step 1: Substituir o conteúdo de `src/app/api/admin/stats/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const supabaseAdmin = await createClient(true)

    // Buscar até 1000 usuários para contagens baseadas em datas
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    const allUsers = usersData?.users || []
    const totalUsers = usersData?.total ?? allUsers.length

    // Usuários ativos (login nos últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeUsers = allUsers.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= thirtyDaysAgo
    ).length

    // Logins hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayLogins = allUsers.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= today
    ).length

    // Crescimento semanal
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const thisWeekNew = allUsers.filter(
      u => new Date(u.created_at) >= sevenDaysAgo
    ).length
    const lastWeekNew = allUsers.filter(u => {
      const d = new Date(u.created_at)
      return d >= fourteenDaysAgo && d < sevenDaysAgo
    }).length
    const weeklyGrowth = lastWeekNew > 0
      ? Math.round(((thisWeekNew - lastWeekNew) / lastWeekNew) * 100 * 10) / 10
      : thisWeekNew > 0 ? 100 : 0

    // Contar projetos
    const { count: totalProjects } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })

    // Usuários pagos (assinatura Stripe ativa)
    const { count: paidUsers } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing'])

    // Usuários em trial (sistema interno, ativo, não expirado)
    const { count: trialUsers } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_trial', true)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())

    const paidCount = paidUsers || 0
    const trialCount = trialUsers || 0
    const freeUsers = Math.max(0, totalUsers - paidCount - trialCount)

    return NextResponse.json({
      totalUsers,
      totalProjects: totalProjects || 0,
      activeUsers,
      systemStatus: 'operational',
      todayLogins,
      weeklyGrowth,
      freeUsers,
      trialUsers: trialCount,
      paidUsers: paidCount
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
cd C:\Users\Fiori\dev\marcaedeixa\site
npx tsc --noEmit
```

Esperado: sem erros no arquivo modificado.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/stats/route.ts
git commit -m "fix: corrige stats admin — usa auth.admin.listUsers e adiciona contagens free/trial/paid"
```

---

## Task 2: Expandir `/api/admin/users` com dados de assinatura

**Files:**
- Modify: `src/app/api/admin/users/route.ts`

### Contexto

Atualmente retorna só `id, email, created_at, last_sign_in_at`. Precisa adicionar `subscription_status`, `plan_name` e `total_spent` fazendo 4 queries extras (stripe_customers, stripe_subscriptions, user_subscriptions, stripe_payments) para o batch de userIds retornado.

- [ ] **Step 1: Substituir o conteúdo de `src/app/api/admin/users/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const supabaseAdmin = await createClient(true)
    const page = Math.floor(offset / limit) + 1

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit
    })

    if (usersError) throw usersError

    const authUsers = usersData?.users || []
    const userIds = authUsers.map(u => u.id)

    if (userIds.length === 0) {
      return NextResponse.json({ users: [], total: 0, limit, offset })
    }

    // Buscar stripe_customers para esse batch
    const { data: stripeCustomers } = await supabaseAdmin
      .from('stripe_customers')
      .select('id, user_id')
      .in('user_id', userIds)

    const customerByUserId = new Map(
      (stripeCustomers || []).map(c => [c.user_id, c.id])
    )
    const internalCustomerIds = (stripeCustomers || []).map(c => c.id)

    // Buscar assinaturas Stripe ativas
    const subscriptionByCustomerId = new Map<string, { plan_name: string }>()
    if (internalCustomerIds.length > 0) {
      const { data: stripeSubs } = await supabaseAdmin
        .from('stripe_subscriptions')
        .select('customer_id, plan_name')
        .in('customer_id', internalCustomerIds)
        .in('status', ['active', 'trialing'])

      for (const sub of stripeSubs || []) {
        subscriptionByCustomerId.set(sub.customer_id, { plan_name: sub.plan_name })
      }
    }

    // Buscar trials ativos
    const { data: trialSubs } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_trial', true)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())

    const trialUserIds = new Set((trialSubs || []).map(s => s.user_id as string))

    // Buscar total gasto por cliente
    const spentByCustomerId = new Map<string, number>()
    if (internalCustomerIds.length > 0) {
      const { data: payments } = await supabaseAdmin
        .from('stripe_payments')
        .select('customer_id, amount')
        .in('customer_id', internalCustomerIds)
        .eq('status', 'succeeded')

      for (const p of payments || []) {
        spentByCustomerId.set(p.customer_id, (spentByCustomerId.get(p.customer_id) || 0) + p.amount)
      }
    }

    // Montar resposta enriquecida
    const users = authUsers.map(u => {
      const internalCustomerId = customerByUserId.get(u.id)
      const stripeSub = internalCustomerId ? subscriptionByCustomerId.get(internalCustomerId) : undefined
      const totalSpent = internalCustomerId ? (spentByCustomerId.get(internalCustomerId) || 0) : 0

      let subscription_status: 'free' | 'trial' | 'paid' = 'free'
      let plan_name: string | null = null

      if (stripeSub) {
        subscription_status = 'paid'
        plan_name = stripeSub.plan_name
      } else if (trialUserIds.has(u.id)) {
        subscription_status = 'trial'
      }

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        subscription_status,
        plan_name,
        total_spent: totalSpent
      }
    })

    return NextResponse.json({
      users,
      total: usersData?.total ?? 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Erro ao obter usuários:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat: adiciona subscription_status, plan_name e total_spent na API de usuários admin"
```

---

## Task 3: Adicionar cards free/trial/paid no Dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

### Contexto

O dashboard já chama `/api/admin/stats` e usa o resultado em `stats`. Precisa:
1. Adicionar `freeUsers`, `trialUsers`, `paidUsers` ao estado inicial
2. Importar `UserMinus` e `Clock` do lucide-react (já importa `CreditCard`)
3. Adicionar uma segunda linha de cards após os 4 existentes

- [ ] **Step 1: Adicionar os 3 campos ao estado inicial `stats`**

Localizar em `src/app/admin/page.tsx` o bloco:

```ts
const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeUsers: 0,
    systemStatus: 'operational',
    todayLogins: 0,
    weeklyGrowth: 0
  })
```

Substituir por:

```ts
const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeUsers: 0,
    systemStatus: 'operational',
    todayLogins: 0,
    weeklyGrowth: 0,
    freeUsers: 0,
    trialUsers: 0,
    paidUsers: 0
  })
```

- [ ] **Step 2: Adicionar `UserMinus` e `Clock` aos imports do lucide-react**

Localizar a linha:

```ts
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  LogOut,
  RefreshCw,
  CreditCard,
  Activity,
  TrendingUp,
  CheckCircle,
  Menu,
  X,
  Eye
} from 'lucide-react'
```

Substituir por:

```ts
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  LogOut,
  RefreshCw,
  CreditCard,
  Activity,
  TrendingUp,
  CheckCircle,
  Menu,
  X,
  Eye,
  UserMinus,
  Clock
} from 'lucide-react'
```

- [ ] **Step 3: Adicionar a segunda linha de cards após os 4 cards existentes**

Localizar o fechamento do grid dos 4 cards (linha após o card de "Logins Hoje"):

```tsx
          </div>

          {/* Ações Rápidas */}
```

Inserir antes de `{/* Ações Rápidas */}`:

```tsx
          {/* Separação Gratuito / Trial / Pago */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Gratuitos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.freeUsers}</p>
                    <p className="text-sm text-gray-500 mt-1">Sem assinatura ativa</p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <UserMinus className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Em Trial</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.trialUsers}</p>
                    <p className="text-sm text-gray-500 mt-1">Trial ativo (3 dias)</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pagos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.paidUsers}</p>
                    <p className="text-sm text-gray-500 mt-1">Assinatura Stripe ativa</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

```

- [ ] **Step 4: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: adiciona cards gratuitos/trial/pagos no dashboard admin"
```

---

## Task 4: Substituir mock por dados reais na página de Clientes

**Files:**
- Modify: `src/app/admin/customers/page.tsx`

### Contexto

O arquivo inteiro usa `mockCustomers` (array de 5 clientes fictícios definido dentro de `loadCustomers`). Precisa:
1. Atualizar o tipo `Customer` para aceitar `subscription_status: 'free'`
2. Substituir `loadCustomers` por chamada à API real
3. Atualizar `getStatusBadge` para lidar com `'free'`
4. Exibir `"—"` na coluna de Projetos (dado não disponível na API ainda)

- [ ] **Step 1: Atualizar o tipo `Customer` para incluir `'free'` e `plan_name`**

Localizar:

```ts
interface Customer {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  last_sign_in_at?: string
  is_active: boolean
  subscription_status: 'active' | 'inactive' | 'trial' | 'expired'
  total_projects: number
  total_spent: number
  last_activity: string
}
```

Substituir por:

```ts
interface Customer {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  last_sign_in_at?: string
  is_active: boolean
  subscription_status: 'free' | 'trial' | 'paid'
  plan_name: string | null
  total_projects: number | null
  total_spent: number
  last_activity: string
}
```

- [ ] **Step 2: Substituir a função `loadCustomers` inteira**

Localizar e remover todo o bloco `const loadCustomers = async () => { ... }` (linhas 99–195 no arquivo original) e substituir por:

```ts
  const loadCustomers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users?limit=50&offset=0')
      if (!response.ok) throw new Error('Falha ao carregar clientes')

      const data = await response.json()
      const loaded: Customer[] = (data.users || []).map((u: {
        id: string
        email: string
        created_at: string
        last_sign_in_at: string | null
        subscription_status: 'free' | 'trial' | 'paid'
        plan_name: string | null
        total_spent: number
      }) => ({
        id: u.id,
        email: u.email,
        full_name: undefined,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? undefined,
        is_active: true,
        subscription_status: u.subscription_status,
        plan_name: u.plan_name,
        total_projects: null,
        total_spent: u.total_spent / 100,
        last_activity: u.last_sign_in_at ?? u.created_at
      }))

      setCustomers(loaded)

      const totalCustomers = loaded.length
      const paidCustomers = loaded.filter(c => c.subscription_status === 'paid').length
      const trialCustomers = loaded.filter(c => c.subscription_status === 'trial').length
      const activeCustomers = paidCustomers + trialCustomers
      const totalRevenue = loaded.reduce((sum, c) => sum + c.total_spent, 0)
      const newCustomersThisMonth = loaded.filter(c =>
        new Date(c.created_at).getMonth() === new Date().getMonth() &&
        new Date(c.created_at).getFullYear() === new Date().getFullYear()
      ).length

      setStats({
        totalCustomers,
        activeCustomers,
        trialCustomers,
        totalRevenue,
        averageProjectsPerUser: 0,
        newCustomersThisMonth
      })
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setError('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }
```

- [ ] **Step 3: Remover o import não utilizado de `createClient`**

Localizar e remover a linha:

```ts
import { createClient } from '@/lib/supabase/client'
```

- [ ] **Step 4: Atualizar `getStatusBadge` para os novos valores de status**

Localizar:

```ts
  const getStatusBadge = (customer: Customer) => {
    if (!customer.is_active) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Inativo</Badge>
    }
    
    switch (customer.subscription_status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>
      case 'trial':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'expired':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Expirado</Badge>
      default:
        return <Badge variant="secondary">Inativo</Badge>
    }
  }
```

Substituir por:

```ts
  const getStatusBadge = (customer: Customer) => {
    switch (customer.subscription_status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>
      case 'trial':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'free':
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Gratuito</Badge>
    }
  }
```

- [ ] **Step 5: Atualizar a célula de Projetos na tabela para exibir "—" quando null**

Localizar:

```tsx
                      <td className="py-4 px-4">
                        <span className="font-medium">{customer.total_projects}</span>
                      </td>
```

Substituir por:

```tsx
                      <td className="py-4 px-4">
                        <span className="font-medium">{customer.total_projects ?? '—'}</span>
                      </td>
```

- [ ] **Step 6: Atualizar a mesma exibição no Modal de Detalhes**

Localizar no modal:

```tsx
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de Projetos:</span>
                      <span className="font-medium">{selectedCustomer.total_projects}</span>
                    </div>
```

Substituir por:

```tsx
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de Projetos:</span>
                      <span className="font-medium">{selectedCustomer.total_projects ?? '—'}</span>
                    </div>
```

- [ ] **Step 7: Atualizar a exibição de Status da Assinatura no Modal de Detalhes**

Localizar:

```tsx
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Assinatura:</span>
                      <span className="capitalize">{selectedCustomer.subscription_status}</span>
                    </div>
```

Substituir por:

```tsx
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plano:</span>
                      <span>{selectedCustomer.plan_name ?? selectedCustomer.subscription_status}</span>
                    </div>
```

- [ ] **Step 8: Atualizar opções do dropdown de filtro de Assinatura**

Localizar o `<SelectContent>` do filtro de assinatura:

```tsx
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                    <SelectItem value="expired">Expirada</SelectItem>
                  </SelectContent>
```

Substituir por:

```tsx
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="free">Gratuito</SelectItem>
                  </SelectContent>
```

- [ ] **Step 9: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 10: Commit**

```bash
git add src/app/admin/customers/page.tsx
git commit -m "feat: clientes admin agora usa dados reais — remove mockCustomers, integra API"
```

---

## Task 5: Verificação final

- [ ] **Step 1: Build completo**

```powershell
npm run build
```

Esperado: build sem erros. Warnings de lint são aceitáveis.

- [ ] **Step 2: Iniciar servidor e testar manualmente**

```powershell
npm run dev
```

Acessar:
- `http://localhost:3000/admin` → fazer login → verificar que os 7 cards aparecem com números reais (não zeros ou 12.5% hardcoded)
- `http://localhost:3000/admin/customers` → verificar que a tabela mostra usuários reais com e-mails reais, badges corretos (Gratuito/Trial/Pago), e coluna "Projetos" mostrando "—"

- [ ] **Step 3: Commit final (se não houver nada pendente)**

```bash
git status
```

Se limpo, o trabalho está completo.
