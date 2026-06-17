# Entrega 2: Gestão de Assinaturas e Vídeo na Landing Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar cancelamento e troca de plano no painel admin de assinaturas, e exibir vídeo do YouTube no Hero da landing page.

**Architecture:** Novo endpoint `POST /api/admin/subscriptions/manage` resolve a cadeia `user_id → stripe_customers → stripe_subscriptions → Stripe API` usando service role. A landing page ganha um `useEffect` que busca a URL de vídeo configurada pelo admin e renderiza um iframe do YouTube no Hero quando disponível.

**Tech Stack:** Next.js 15, TypeScript, Supabase (service role), Stripe SDK, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-06-17-entrega-2-subscriptions-youtube-design.md`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/app/api/admin/subscriptions/manage/route.ts` | Criar | Endpoint POST para cancelar/trocar plano via Stripe |
| `src/app/admin/subscriptions/page.tsx` | Modificar | Adicionar botões cancel/change-plan + dialogs no modal |
| `src/lib/utils.ts` | Modificar | Adicionar `extractYouTubeEmbedUrl()` |
| `src/app/page.tsx` | Modificar | Fetch de vídeo + render condicional do iframe no Hero |

---

## Task 1: Utility `extractYouTubeEmbedUrl`

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Adicionar a função em `src/lib/utils.ts`**

Abra `src/lib/utils.ts` e adicione ao final do arquivo:

```typescript
/**
 * Extrai e normaliza uma URL do YouTube para formato embed.
 * Aceita: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 * Retorna null se o formato não for reconhecido.
 */
export function extractYouTubeEmbedUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
  }

  return null
}
```

- [ ] **Step 2: Verificar que o arquivo compila sem erros**

```bash
cd C:/Users/Fiori/dev/marcaedeixa/site
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros relacionados a `utils.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat(utils): add extractYouTubeEmbedUrl helper"
```

---

## Task 2: Vídeo YouTube no Hero da Landing Page

**Files:**
- Modify: `src/app/page.tsx`

Contexto: O Hero tem um bloco `<div className="relative hidden lg:block">` que exibe o mockup "Seu projeto aqui". Quando `demo_video_url` estiver configurado no admin, esse bloco deve renderizar um iframe do YouTube no lugar.

- [ ] **Step 1: Adicionar import e estado para URL do vídeo**

Em `src/app/page.tsx`, adicione o import de `extractYouTubeEmbedUrl` junto aos outros imports do `@/lib`:

```typescript
import { extractYouTubeEmbedUrl } from '@/lib/utils'
```

Dentro do componente `Home`, após as declarações de estado existentes (`openFaq`, `mobileMenuOpen`), adicione:

```typescript
const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)
```

- [ ] **Step 2: Adicionar useEffect para buscar URL do vídeo**

Após os `useEffect` existentes (o de redirect do usuário logado), adicione:

```typescript
useEffect(() => {
  fetch('/api/admin/landing-content?section=media')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const embedUrl = extractYouTubeEmbedUrl(data?.content?.demo_video_url)
      if (embedUrl) setHeroVideoUrl(embedUrl)
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 3: Substituir o bloco do mockup por render condicional**

Localize o bloco que começa com:
```tsx
{/* Visual Element */}
<div className="relative hidden lg:block">
```

Substitua o conteúdo interno (mantendo a `<div className="relative hidden lg:block">` externa) para renderizar condicionalmente:

```tsx
{/* Visual Element */}
<div className="relative hidden lg:block">
  {heroVideoUrl ? (
    <div className="rounded-3xl overflow-hidden shadow-2xl aspect-video">
      <iframe
        src={heroVideoUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Demo do Marca e Deixa"
      />
    </div>
  ) : (
    <div className="relative">
      {/* Main Card */}
      <div className="bg-black rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex items-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
        </div>
        <div className="hero-preview-animate aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 p-8">
          <div className="h-full border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Play className="w-10 h-10 text-white" />
              </div>
              <p className="text-gray-400 font-medium">Seu projeto aqui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">Salvo!</p>
            <p className="text-xs text-gray-500">Há 2 segundos</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">12 cenas</p>
            <p className="text-xs text-gray-500">criadas hoje</p>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: Verificar que compila sem erros**

```bash
cd C:/Users/Fiori/dev/marcaedeixa/site
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros em `page.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): show YouTube video in hero when configured in admin"
```

---

## Task 3: Endpoint Admin `POST /api/admin/subscriptions/manage`

**Files:**
- Create: `src/app/api/admin/subscriptions/manage/route.ts`

Este endpoint recebe `{ userId, action, newPriceId? }` e executa a ação no Stripe usando service role. Não requer que o usuário chamador seja o dono da assinatura.

- [ ] **Step 1: Criar o arquivo do endpoint**

Crie `src/app/api/admin/subscriptions/manage/route.ts` com o conteúdo:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cancelSubscription, updateSubscription } from '@/lib/stripe-config'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, newPriceId } = body as {
      userId: string
      action: 'cancel' | 'change_plan'
      newPriceId?: string
    }

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId e action são obrigatórios' },
        { status: 400 }
      )
    }

    if (action === 'change_plan' && !newPriceId) {
      return NextResponse.json(
        { error: 'newPriceId é obrigatório para change_plan' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Resolve userId → stripe_customers
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Usuário não possui cliente Stripe' },
        { status: 404 }
      )
    }

    // 2. Resolve customer_id → stripe_subscriptions (assinatura ativa)
    const { data: subscription, error: subError } = await supabase
      .from('stripe_subscriptions')
      .select('stripe_subscription_id, plan_id')
      .eq('customer_id', customer.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Usuário não possui assinatura ativa' },
        { status: 404 }
      )
    }

    const stripeSubscriptionId = subscription.stripe_subscription_id

    if (action === 'cancel') {
      const result = await cancelSubscription(stripeSubscriptionId, true)

      // Atualiza flag local no banco
      await supabase
        .from('stripe_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('stripe_subscription_id', stripeSubscriptionId)

      return NextResponse.json({
        success: true,
        cancelAtPeriodEnd: result.cancel_at_period_end,
        currentPeriodEnd: (result as any).current_period_end
          ? new Date((result as any).current_period_end * 1000).toISOString()
          : null,
      })
    }

    if (action === 'change_plan') {
      if (subscription.plan_id === newPriceId) {
        return NextResponse.json(
          { error: 'O usuário já está neste plano' },
          { status: 400 }
        )
      }

      const result = await updateSubscription(stripeSubscriptionId, newPriceId!)

      // Atualiza plan_id local no banco (plan_name será atualizado pelo webhook)
      await supabase
        .from('stripe_subscriptions')
        .update({ plan_id: newPriceId })
        .eq('stripe_subscription_id', stripeSubscriptionId)

      return NextResponse.json({
        success: true,
        newPlanId: newPriceId,
        status: result.status,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/admin/subscriptions/manage:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verificar que compila sem erros**

```bash
cd C:/Users/Fiori/dev/marcaedeixa/site
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros no novo arquivo

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/subscriptions/manage/route.ts
git commit -m "feat(admin): add POST /api/admin/subscriptions/manage endpoint"
```

---

## Task 4: UI de Cancelar e Trocar Plano no Modal Admin

**Files:**
- Modify: `src/app/admin/subscriptions/page.tsx`

O modal de detalhes da assinatura (`Dialog`) já existe. Precisamos adicionar:
1. Busca de preços disponíveis ao abrir o modal de uma assinatura ativa
2. Botão "Trocar Plano" com select expansível
3. Botão "Cancelar Assinatura" com dialog de confirmação

- [ ] **Step 1: Adicionar novos estados ao componente**

Localize as declarações de estado existentes (perto do topo do componente `AdminSubscriptionsPage`). Adicione após `const [success, setSuccess] = useState('')`:

```typescript
const [cancelConfirming, setCancelConfirming] = useState(false)
const [cancelLoading, setCancelLoading] = useState(false)
const [changingPlan, setChangingPlan] = useState(false)
const [changePlanLoading, setChangePlanLoading] = useState(false)
const [availablePrices, setAvailablePrices] = useState<Array<{
  priceId: string
  label: string
  amount: number
}>>([])
const [selectedPriceId, setSelectedPriceId] = useState('')
```

- [ ] **Step 2: Buscar preços disponíveis quando o modal abre com assinatura ativa**

Adicione um `useEffect` após os useEffects existentes:

```typescript
useEffect(() => {
  if (!selectedSubscription) {
    setCancelConfirming(false)
    setChangingPlan(false)
    setSelectedPriceId('')
    return
  }

  const isActive = selectedSubscription.status !== 'cancelled' && selectedSubscription.days_remaining > 0
  if (!isActive) return

  fetch('/api/stripe/prices')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data?.plans) return
      const prices: Array<{ priceId: string; label: string; amount: number }> = []
      for (const plan of data.plans) {
        if (plan.prices?.monthly) {
          prices.push({
            priceId: plan.prices.monthly.priceId,
            label: `${plan.name} — Mensal`,
            amount: plan.prices.monthly.amount,
          })
        }
        if (plan.prices?.yearly) {
          prices.push({
            priceId: plan.prices.yearly.priceId,
            label: `${plan.name} — Anual`,
            amount: plan.prices.yearly.amount,
          })
        }
      }
      setAvailablePrices(prices)
    })
    .catch(() => {})
}, [selectedSubscription])
```

- [ ] **Step 3: Adicionar função `handleCancelSubscription`**

Adicione após a função `formatCurrency`:

```typescript
const handleCancelSubscription = async () => {
  if (!selectedSubscription) return
  setCancelLoading(true)
  try {
    const res = await fetch('/api/admin/subscriptions/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedSubscription.user_id, action: 'cancel' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao cancelar')
    setSuccess(`Assinatura de ${selectedSubscription.user_email} será cancelada ao fim do período.`)
    setSelectedSubscription(null)
    loadData()
  } catch (err: any) {
    setError(err.message || 'Erro ao cancelar assinatura')
  } finally {
    setCancelLoading(false)
    setCancelConfirming(false)
  }
}
```

- [ ] **Step 4: Adicionar função `handleChangePlan`**

Adicione logo após `handleCancelSubscription`:

```typescript
const handleChangePlan = async () => {
  if (!selectedSubscription || !selectedPriceId) return
  setChangePlanLoading(true)
  try {
    const res = await fetch('/api/admin/subscriptions/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedSubscription.user_id,
        action: 'change_plan',
        newPriceId: selectedPriceId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao trocar plano')
    setSuccess(`Plano de ${selectedSubscription.user_email} atualizado com sucesso.`)
    setSelectedSubscription(null)
    loadData()
  } catch (err: any) {
    setError(err.message || 'Erro ao trocar plano')
  } finally {
    setChangePlanLoading(false)
    setChangingPlan(false)
  }
}
```

- [ ] **Step 5: Adicionar botões de ação no modal**

Dentro do `DialogContent`, localize o bloco `{selectedSubscription && (` e adicione após o grid de informações existente (após o `</div>` do grid), dentro do `<div className="space-y-4">`:

```tsx
{selectedSubscription.status !== 'cancelled' && selectedSubscription.days_remaining > 0 && (
  <div className="pt-4 border-t space-y-3">
    {/* Trocar Plano */}
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => { setChangingPlan(v => !v); setCancelConfirming(false) }}
      >
        <Edit className="h-4 w-4 mr-2" />
        Trocar Plano
      </Button>

      {changingPlan && (
        <div className="mt-3 space-y-2">
          <Select value={selectedPriceId} onValueChange={setSelectedPriceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o novo plano..." />
            </SelectTrigger>
            <SelectContent>
              {availablePrices.map(p => (
                <SelectItem key={p.priceId} value={p.priceId}>
                  {p.label} — {formatCurrency(p.amount / 100)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="w-full"
            disabled={!selectedPriceId || changePlanLoading}
            onClick={handleChangePlan}
          >
            {changePlanLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Troca
          </Button>
        </div>
      )}
    </div>

    {/* Cancelar Assinatura */}
    <div>
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => { setCancelConfirming(v => !v); setChangingPlan(false) }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Cancelar Assinatura
      </Button>

      {cancelConfirming && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
          <p className="text-sm text-red-800">
            O usuário manterá acesso até <strong>{formatDate(selectedSubscription.end_date)}</strong>. Confirmar cancelamento?
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            disabled={cancelLoading}
            onClick={handleCancelSubscription}
          >
            {cancelLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Sim, Cancelar
          </Button>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 6: Verificar que `RefreshCw` já está importado**

No topo do arquivo, o import `RefreshCw` já existe. Confirme que `Edit` também está importado (já está na lista de imports da linha 1). Se faltar, adicione ao bloco `import { ..., Edit } from 'lucide-react'`.

- [ ] **Step 7: Verificar que compila sem erros**

```bash
cd C:/Users/Fiori/dev/marcaedeixa/site
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros em `admin/subscriptions/page.tsx`

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/subscriptions/page.tsx
git commit -m "feat(admin): add cancel and change plan actions to subscriptions modal"
```

---

## Task 5: Push, Build e Deploy

- [ ] **Step 1: Verificar build completo**

```bash
cd C:/Users/Fiori/dev/marcaedeixa/site
npm run build 2>&1 | tail -20
```

Esperado: `✓ Compiled successfully` sem erros

- [ ] **Step 2: Push para main**

```bash
git push origin main
```

- [ ] **Step 3: Deploy para produção via Vercel**

```bash
npx vercel --prod --yes 2>&1 | tail -10
```

Esperado: URL de produção confirmada no output

---

## Notas de Implementação

- O cancelamento via Stripe é `cancel_at_period_end: true` — o usuário NÃO perde o acesso imediatamente
- A troca de plano usa `proration_behavior: 'create_prorations'` (já implementado em `updateSubscription`) — o Stripe calcula o crédito/débito proporcional automaticamente
- O `plan_name` em `stripe_subscriptions` será atualizado pelo webhook existente após a mudança no Stripe; por ora atualizamos apenas o `plan_id` localmente
- O vídeo só aparece em `lg` (≥1024px) — comportamento idêntico ao mockup atual
- Se `demo_video_url` estiver vazio no admin, o mockup original é exibido sem nenhuma mudança visual
