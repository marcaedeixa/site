# Customers Stats Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar as estatísticas do topo da página `/admin/customers` para mostrar dados reais (base completa de usuários), separar o fetch de stats do fetch da tabela, e exibir funil de conversão + alertas de trials expirando.

**Architecture:** Dois ajustes paralelos — (1) backend: adicionar 3 campos ao endpoint `/api/admin/stats` já existente; (2) frontend: separar `loadStats` de `loadCustomers`, atualizar a interface `CustomerStats`, e substituir os 6 cards atuais por um layout de 2 linhas (4 KPIs + funil/atividade).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (supabaseAdmin), Tailwind CSS, shadcn/ui, Lucide React

---

## Mapa de arquivos

| Arquivo | Operação | O que muda |
|---|---|---|
| `src/app/api/admin/stats/route.ts` | Modificar | Adiciona `mrr`, `trialsExpiringSoon`, `newThisWeek` ao response |
| `src/app/admin/customers/page.tsx` | Modificar | Nova interface `CustomerStats`, `loadStats()` separado, novo layout de stats |

---

## Task 1: Estender `/api/admin/stats` com mrr, trialsExpiringSoon e newThisWeek

**Arquivo:** `src/app/api/admin/stats/route.ts`

Atualmente o endpoint calcula `thisWeekNew` mas não o retorna. Precisamos adicioná-lo ao response junto com dois novos campos: `mrr` (soma dos pagamentos do mês) e `trialsExpiringSoon` (trials que expiram nos próximos 7 dias).

- [ ] **Step 1: Adicionar query de `trialsExpiringSoon`**

No arquivo `src/app/api/admin/stats/route.ts`, adicionar o seguinte bloco **depois do bloco de `trialQuery`** (após a linha `const trialCount = trialUsersCount || 0`):

```typescript
    // Trials expirando nos próximos 7 dias
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const { count: trialsExpiringSoonCount } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_trial', true)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .lte('end_date', sevenDaysFromNow.toISOString())
    const trialsExpiringSoon = trialsExpiringSoonCount || 0
```

- [ ] **Step 2: Adicionar query de `mrr`**

Logo após o bloco do Step 1, adicionar:

```typescript
    // Receita do mês corrente (em centavos, como armazenado)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { data: monthlyPaymentsData } = await supabaseAdmin
      .from('stripe_payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', startOfMonth.toISOString())
    const mrr = (monthlyPaymentsData || []).reduce(
      (sum, p) => sum + (p.amount as number), 0
    )
```

- [ ] **Step 3: Adicionar os 3 campos ao objeto de response**

Localizar o `return NextResponse.json({...})` no final da função e adicionar os três novos campos:

```typescript
    return NextResponse.json({
      totalUsers,
      totalProjects: totalProjects || 0,
      activeUsers,
      systemStatus: 'operational',
      todayLogins,
      weeklyGrowth,
      freeUsers,
      trialUsers: trialCount,
      paidUsers: paidCount,
      newThisWeek: thisWeekNew,
      trialsExpiringSoon,
      mrr,
    })
```

- [ ] **Step 4: Verificar que o endpoint compila sem erro**

```bash
cd site && npx tsc --noEmit
```

Expected: sem erros relacionados a `stats/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/stats/route.ts
git commit -m "feat(api): add mrr, trialsExpiringSoon and newThisWeek to /admin/stats"
```

---

## Task 2: Atualizar interface CustomerStats e adicionar loadStats()

**Arquivo:** `src/app/admin/customers/page.tsx`

Trocar a interface antiga, o estado inicial, e o `useEffect` de carregamento. Remover o cálculo de stats inline dentro de `loadCustomers`.

- [ ] **Step 1: Substituir a interface `CustomerStats`**

Localizar:
```typescript
interface CustomerStats {
  totalCustomers: number
  activeCustomers: number
  trialCustomers: number
  totalRevenue: number
  averageProjectsPerUser: number
  newCustomersThisMonth: number
}
```

Substituir por:
```typescript
interface CustomerStats {
  totalUsers: number
  mrr: number
  paidUsers: number
  trialUsers: number
  freeUsers: number
  trialsExpiringSoon: number
  weeklyGrowth: number
  todayLogins: number
  newThisWeek: number
}
```

- [ ] **Step 2: Substituir o estado inicial de `stats`**

Localizar:
```typescript
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    trialCustomers: 0,
    totalRevenue: 0,
    averageProjectsPerUser: 0,
    newCustomersThisMonth: 0
  })
```

Substituir por:
```typescript
  const [stats, setStats] = useState<CustomerStats>({
    totalUsers: 0,
    mrr: 0,
    paidUsers: 0,
    trialUsers: 0,
    freeUsers: 0,
    trialsExpiringSoon: 0,
    weeklyGrowth: 0,
    todayLogins: 0,
    newThisWeek: 0,
  })
```

- [ ] **Step 3: Adicionar função `loadStats`**

Adicionar a função **antes** de `loadCustomers`:

```typescript
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Falha ao carregar estatísticas')
      const data = await response.json()
      setStats({
        totalUsers: data.totalUsers ?? 0,
        mrr: data.mrr ?? 0,
        paidUsers: data.paidUsers ?? 0,
        trialUsers: data.trialUsers ?? 0,
        freeUsers: data.freeUsers ?? 0,
        trialsExpiringSoon: data.trialsExpiringSoon ?? 0,
        weeklyGrowth: data.weeklyGrowth ?? 0,
        todayLogins: data.todayLogins ?? 0,
        newThisWeek: data.newThisWeek ?? 0,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }
```

- [ ] **Step 4: Remover cálculo de stats de dentro de `loadCustomers`**

Dentro de `loadCustomers`, localizar e **remover** todo este bloco (fica depois de `setCustomers(loaded)`):

```typescript
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
```

- [ ] **Step 5: Atualizar `useEffect` para chamar `loadStats` junto com `loadCustomers`**

Localizar:
```typescript
  useEffect(() => {
    if (adminUser) {
      loadCustomers()
    }
  }, [adminUser])
```

Substituir por:
```typescript
  useEffect(() => {
    if (adminUser) {
      loadStats()
      loadCustomers()
    }
  }, [adminUser])
```

- [ ] **Step 6: Adicionar `TrendingUp` aos imports do Lucide**

Localizar a linha de imports do lucide-react e adicionar `TrendingUp`:
```typescript
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Trash2,
  UserCheck, 
  UserX, 
  RefreshCw, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Calendar,
  CreditCard,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
```

- [ ] **Step 7: Verificar que o arquivo compila**

```bash
npx tsc --noEmit
```

Expected: sem erros em `customers/page.tsx`.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/customers/page.tsx
git commit -m "feat(customers): separate loadStats from loadCustomers, update CustomerStats interface"
```

---

## Task 3: Substituir o layout de stats por 2 linhas (4 KPIs + Funil/Atividade)

**Arquivo:** `src/app/admin/customers/page.tsx`

Substituir o bloco `{/* Estatísticas */}` (6 cards em grid de 6 colunas) pelo novo layout de 2 linhas.

- [ ] **Step 1: Remover o bloco de estatísticas atual**

Localizar e remover todo o bloco abaixo (do comentário até o `</div>` de fechamento do grid):

```tsx
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            ... (6 cards completos)
          </Card>
        </div>
```

- [ ] **Step 2: Inserir o novo bloco de stats no mesmo lugar**

Inserir o seguinte código onde o bloco antigo estava:

```tsx
        {/* Stats — Linha 1: 4 KPIs principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total de Clientes */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className={`text-xs mt-1 ${stats.newThisWeek > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {stats.newThisWeek > 0 ? `+${stats.newThisWeek} esta semana` : 'Sem novos esta semana'}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receita do Mês */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita do Mês</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {(stats.mrr / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Conversão */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers > 0
                      ? Math.round((stats.paidUsers / stats.totalUsers) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs mt-1 text-gray-400">{stats.paidUsers} pagantes</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trials Expirando */}
          <Card
            className={`transition-colors ${stats.trialsExpiringSoon > 0 ? 'cursor-pointer hover:bg-amber-50' : ''}`}
            onClick={() => stats.trialsExpiringSoon > 0 && setSubscriptionFilter('trial')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trials Expirando</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.trialsExpiringSoon}</p>
                  <p className="text-xs mt-1 text-gray-400">próximos 7 dias</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  stats.trialsExpiringSoon === 0
                    ? 'bg-gray-100'
                    : stats.trialsExpiringSoon <= 5
                    ? 'bg-yellow-100'
                    : 'bg-orange-100'
                }`}>
                  <AlertTriangle className={`h-6 w-6 ${
                    stats.trialsExpiringSoon === 0
                      ? 'text-gray-400'
                      : stats.trialsExpiringSoon <= 5
                      ? 'text-yellow-600'
                      : 'text-orange-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats — Linha 2: Funil + Atividade */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Funil de Conversão */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-600 mb-4">Funil de Conversão</p>
              {[
                { label: 'Gratuito', count: stats.freeUsers, color: 'bg-gray-400' },
                { label: 'Trial', count: stats.trialUsers, color: 'bg-blue-400' },
                { label: 'Pago', count: stats.paidUsers, color: 'bg-green-500' },
              ].map(({ label, count, color }) => {
                const pct = stats.totalUsers > 0
                  ? Math.round((count / stats.totalUsers) * 100)
                  : 0
                return (
                  <div key={label} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-medium text-gray-900">
                        {count}{' '}
                        <span className="text-gray-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Crescimento Semanal */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Crescimento Semanal</p>
                  <p className={`text-2xl font-bold ${stats.weeklyGrowth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth}%
                  </p>
                  <p className="text-xs mt-1 text-gray-400">vs. semana anterior</p>
                </div>
                <div className={`p-3 rounded-lg ${stats.weeklyGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`h-6 w-6 ${stats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logins Hoje */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Logins Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayLogins}</p>
                  <p className="text-xs mt-1 text-gray-400">usuários únicos</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Activity className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
```

- [ ] **Step 3: Remover imports não usados**

Os ícones `UserX`, `Calendar` e `Clock` não são mais usados na seção de stats (ainda podem ser usados no modal — verificar). Se não forem usados em nenhum outro lugar do arquivo, remover dos imports Lucide.

Verificar ocorrências no arquivo:
- `UserX` — usado no dropdown da tabela e no modal → **manter**
- `Calendar` — não usado em nenhum outro lugar → **remover**
- `Clock` — não usado em nenhum outro lugar → **remover**

- [ ] **Step 4: Verificar que o arquivo compila sem erros**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/customers/page.tsx
git commit -m "feat(customers): redesign stats section with 2-row KPI + funnel layout"
```

---

## Verificação Final

- [ ] Abrir `http://localhost:3000/admin/customers` logado como admin
- [ ] Confirmar que os 4 KPIs da linha 1 exibem números reais (não zeros)
- [ ] Confirmar que o card "Funil de Conversão" exibe barras proporcionais para Gratuito / Trial / Pago
- [ ] Confirmar que "Crescimento Semanal" e "Logins Hoje" exibem valores
- [ ] Se houver trials expirando em 7 dias: clicar no card e confirmar que a tabela filtra para `subscription = trial`
- [ ] Confirmar que a tabela de clientes ainda carrega normalmente (paginação, busca, filtros)
