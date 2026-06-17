# Entrega 2: Gestão de Assinaturas e Vídeo na Landing Page

**Data:** 2026-06-17  
**Escopo:** Painel admin — cancelar assinatura, trocar plano; Landing page — vídeo YouTube no Hero

---

## Contexto

O painel admin já exibe a lista de assinaturas (`admin/subscriptions`) mas não permite nenhuma ação sobre elas. As funções `cancelSubscription()` e `updateSubscription()` já existem em `src/lib/stripe-config.ts` e o endpoint `PUT /api/stripe/subscriptions` já aceita as ações, mas é protegido por autenticação do usuário dono da assinatura.

A landing page está completamente hardcoded em `src/app/page.tsx`. O painel admin já tem campos de URL de vídeo na aba Mídia (`landing_page_content.media`), mas a landing não os lê.

---

## Funcionalidade 1: Cancelar Assinatura pelo Painel

### Comportamento

- Cancelamento **ao fim do período pago** (`cancel_at_period_end: true`)
- O usuário mantém acesso até a data de renovação já paga; depois o acesso é removido automaticamente via webhook existente
- O admin não precisa acessar o Stripe Dashboard

### API: `POST /api/admin/subscriptions/manage`

Novo endpoint, usando Supabase service role. Não depende de autenticação de usuário final.

**Request body:**
```json
{ "userId": "uuid", "action": "cancel" }
```

**Fluxo interno:**
1. `userId → stripe_customers (user_id)` → obtém `customer_id`
2. `customer_id → stripe_subscriptions` filtrando `status IN ('active', 'trialing')` → obtém `stripe_subscription_id`
3. Chama `cancelSubscription(stripe_subscription_id, true)` (cancel at period end)
4. Retorna `{ success: true, cancelAtPeriodEnd: true, currentPeriodEnd: Date }`

**Erros tratados:**
- Usuário não tem cliente Stripe → 404
- Usuário não tem assinatura ativa → 404
- Erro do Stripe → 500 com mensagem

### UI: Modal de detalhes existente (`admin/subscriptions/page.tsx`)

Adiciona ao rodapé do modal (apenas para assinaturas com status ativo):
- Botão **"Cancelar Assinatura"** (variante destrutiva)
- Ao clicar: abre diálogo de confirmação mostrando a data de expiração ("O usuário manterá acesso até DD/MM/AAAA")
- Confirmar: chama o endpoint, exibe loading, depois mensagem de sucesso e recarrega a lista
- O badge da assinatura passa a mostrar "Cancelada" (status `cancelled` ou `cancel_at_period_end`)

---

## Funcionalidade 2: Alterar Plano de um Usuário

### Comportamento

- Proration automática: Stripe calcula a diferença proporcional e gera crédito/cobrança imediata
- Admin seleciona o novo plano a partir dos planos disponíveis no Stripe
- Pode fazer upgrade ou downgrade

### API: `POST /api/admin/subscriptions/manage` (mesmo endpoint, ação diferente)

**Request body:**
```json
{ "userId": "uuid", "action": "change_plan", "newPriceId": "price_xxx" }
```

**Fluxo interno:**
1. Mesma resolução: `userId → stripe_customers → stripe_subscriptions → stripe_subscription_id`
2. Chama `updateSubscription(stripe_subscription_id, newPriceId)` (já implementado com `proration_behavior: 'create_prorations'`)
3. Atualiza `stripe_subscriptions.plan_id` e `plan_name` no banco local
4. Retorna `{ success: true, newPlan: string }`

**Erros tratados:**
- `newPriceId` ausente → 400
- Mesma price já ativa → 400 com mensagem clara
- Erro do Stripe → 500

### UI: Modal de detalhes existente

Adiciona ao rodapé do modal (logo acima do botão de cancelar, apenas para assinaturas ativas):
- Botão **"Trocar Plano"**
- Ao clicar: expande um `<Select>` com os planos disponíveis, buscados de `/api/stripe/prices` (endpoint já existente)
- Exibe nome do plano e preço mensal em cada opção
- Botão **"Confirmar Troca"** chama o endpoint com o `priceId` selecionado
- Loading state durante a chamada; sucesso fecha o expansível e recarrega a lista

---

## Funcionalidade 3: Vídeo YouTube no Hero da Landing

### Configuração pelo Admin

Campo já existente: **"URL do Vídeo Demo"** (`demo_video_url`) na aba Mídia do painel `admin/landing`.

O admin cola qualquer formato de URL do YouTube:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

### Normalização da URL

Função utilitária `extractYouTubeEmbedUrl(url: string): string | null` criada em `src/lib/utils.ts`:
- Extrai o `VIDEO_ID` de qualquer dos três formatos acima via regex
- Retorna `https://www.youtube.com/embed/VIDEO_ID` ou `null` se o formato não for reconhecido

### Fetch na Landing Page (`src/app/page.tsx`)

Adiciona estado `heroVideoUrl: string | null` inicializado como `null`.

`useEffect` ao montar:
```
GET /api/admin/landing-content?section=media
→ extrai demo_video_url do content
→ passa por extractYouTubeEmbedUrl()
→ seta heroVideoUrl se válido
```

Nenhuma mudança na lógica de redirect ou autenticação.

### Renderização no Hero

**Com vídeo** (`heroVideoUrl !== null`):
O bloco `<div className="relative hidden lg:block">` (que contém o mockup) é substituído por:
```html
<div className="relative hidden lg:block">
  <div className="rounded-3xl overflow-hidden shadow-2xl aspect-video">
    <iframe
      src={heroVideoUrl}
      className="w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
</div>
```

**Sem vídeo** (`heroVideoUrl === null`):
O mockup atual ("Seu projeto aqui") continua sendo renderizado. Nenhuma regressão visual.

O vídeo só aparece no breakpoint `lg` (≥1024px), mantendo o comportamento responsivo atual do mockup.

---

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/app/api/admin/subscriptions/manage/route.ts` | **Novo** — endpoint admin para cancelar/trocar plano |
| `src/app/admin/subscriptions/page.tsx` | Adiciona botões + lógica de cancel/change no modal |
| `src/app/page.tsx` | Adiciona fetch de mídia + render condicional do iframe |
| `src/lib/utils.ts` | Adiciona `extractYouTubeEmbedUrl()` |

---

## O que NÃO está no escopo

- Fazer a landing page ler outros campos do CMS (hero text, about, features) — apenas o vídeo
- Criar novos planos ou preços no Stripe
- Lógica de reembolso ao cancelar
- Notificação por e-mail ao usuário quando admin cancela/troca plano
