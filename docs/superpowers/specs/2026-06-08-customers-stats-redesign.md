# Customers Stats Redesign

**Data:** 2026-06-08  
**Página:** `/admin/customers`  
**Status:** Aprovado

---

## Problema

A seção de estatísticas da página de customers tem três falhas fundamentais:

1. **Dados incorretos:** as stats são calculadas no client-side em cima dos 50 primeiros usuários carregados na tabela, não da base toda.
2. **Card quebrado:** "Média Projetos" está hardcoded em `0.0` e nunca é populado.
3. **Baixa utilidade:** os cards não ajudam a tomar decisões — sem funil de conversão, sem indicadores de tendência, sem alertas acionáveis.

---

## Solução

Redesenho da seção de stats em dois níveis, com dados vindos do endpoint `/api/admin/stats` (base completa de usuários), separando responsabilidades entre stats e listagem de clientes.

---

## Backend

### Mudanças em `/api/admin/stats`

Adicionar três novos campos ao response (o campo `thisWeekNew` já é calculado internamente mas não retornado):

**`mrr` (number)**  
MRR calculado como a soma dos pagamentos do mês corrente:
```sql
SELECT SUM(amount) FROM stripe_payments
WHERE status = 'succeeded'
AND created_at >= início do mês atual
```

**`trialsExpiringSoon` (number)**  
Contagem de trials que expiram nos próximos 7 dias:
```sql
SELECT COUNT(*) FROM user_subscriptions
WHERE is_trial = true
AND status = 'active'
AND end_date > NOW()
AND end_date <= NOW() + interval '7 days'
```

**`newThisWeek` (number)**  
Já calculado internamente (`thisWeekNew`), só precisa ser incluído no objeto de response.

Nenhuma nova rota ou tabela necessária.

---

## Frontend

### Fluxo de dados

Separar completamente stats e listagem de clientes:

```
useEffect → loadStats()     → GET /api/admin/stats  → seta statsData (base toda)
useEffect → loadCustomers() → GET /api/admin/users  → seta customers (paginado)
```

As duas chamadas rodam em paralelo ao carregar a página. As stats nunca mais dependem dos usuários carregados na tabela.

### Tipo `CustomerStats`

```ts
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

### Layout — Linha 1: 4 KPIs principais

Grid de 4 colunas. Dados headline do negócio.

| Card | Valor | Detalhe |
|---|---|---|
| Total de Clientes | `totalUsers` | `+N esta semana` com cor (verde ↑ / vermelho ↓) |
| MRR | `R$ X.XXX,00` | campo `mrr` da stats API |
| Taxa de Conversão | `X%` | `paidUsers / totalUsers * 100` |
| Trials Expirando | `N clientes` | badge colorido por severidade; clicável |

**Comportamento do badge de severidade (Trials Expirando):**
- `0` → cinza
- `1–5` → amarelo
- `6+` → laranja

### Layout — Linha 2: Funil + Atividade

1 card largo (funil) + 2 cards menores.

**Card de Funil (largo):**  
Título: "Funil de Conversão"  
Mostra as três etapas lado a lado com barras de progresso relativas ao total:
- Gratuito: `freeUsers` (N — X%)
- Trial: `trialUsers` (N — X%)
- Pago: `paidUsers` (N — X%)

**Card Crescimento Semanal:**  
Valor: `weeklyGrowth` com `%` e seta de direção (↑ verde / ↓ vermelho)  
Subtítulo: "vs. semana anterior"

**Card Logins Hoje:**  
Valor: `todayLogins`  
Subtítulo: "usuários únicos"

### Interação: Trials Expirando → filtrar tabela

Ao clicar no card "Trials Expirando", chama `setSubscriptionFilter('trial')`. O filtro já existe na página — a mudança é apenas conectar o clique do card a esse setter. Zero lógica nova.

---

## Escalabilidade

- Stats baseadas em agregados no banco (`COUNT`, `SUM`) — não dependem do volume paginado
- A tabela de clientes pode ser paginada livremente sem impactar as stats
- Campo `mrr` pode ser cacheado no futuro se o volume de `stripe_payments` crescer muito

---

## Fora de escopo

- Detalhamento de MRR por plano
- Histórico de churn
- Usuários inativos há X dias (considerado, priorizado para futuro)
- Cache de stats no servidor
