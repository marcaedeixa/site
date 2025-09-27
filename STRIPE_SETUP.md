# Configuração do Stripe

Este documento fornece instruções detalhadas para configurar a integração do Stripe na aplicação.

## 📋 Pré-requisitos

1. Conta no Stripe (https://stripe.com)
2. Chaves de API do Stripe (Publishable Key e Secret Key)
3. Aplicação Next.js rodando

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_MODE=test
```

### 2. Obter Chaves do Stripe

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com)
2. Vá para **Developers > API keys**
3. Copie a **Publishable key** e **Secret key**
4. Cole as chaves nas variáveis de ambiente correspondentes

## 🏗️ Estrutura do Banco de Dados

As seguintes tabelas foram criadas automaticamente:

- `stripe_customers` - Clientes do Stripe
- `stripe_subscriptions` - Assinaturas
- `stripe_payments` - Pagamentos
- `stripe_webhook_events` - Eventos de webhook

## 🔗 Configuração de Webhooks

### Método 1: Automático (Recomendado)

```bash
# Configurar webhooks automaticamente
npm run stripe:webhook setup

# Listar webhooks existentes
npm run stripe:webhook list

# Deletar webhook específico
npm run stripe:webhook delete <webhook_id>
```

### Método 2: Manual

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com)
2. Vá para **Developers > Webhooks**
3. Clique em **Add endpoint**
4. Configure:
   - **Endpoint URL**: `https://seu-dominio.com/api/stripe/webhooks`
   - **Events to send**:
     - `customer.created`
     - `customer.updated`
     - `customer.deleted`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

5. Copie o **Signing secret** e adicione à variável `STRIPE_WEBHOOK_SECRET`

### Desenvolvimento Local

Para testar webhooks localmente, use o Stripe CLI:

```bash
# Instalar Stripe CLI
# Windows (via Chocolatey)
choco install stripe-cli

# macOS (via Homebrew)
brew install stripe/stripe-cli/stripe

# Login no Stripe
stripe login

# Encaminhar webhooks para aplicação local
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

## 🛍️ Configuração de Produtos e Preços

### Método 1: Automático

```typescript
import { initializeStripeProducts } from '@/lib/stripe-config'

// Execute uma vez para criar produtos e preços
await initializeStripeProducts()
```

### Método 2: Manual

1. Acesse **Products** no Dashboard do Stripe
2. Crie produtos para cada plano:
   - **Plano Básico**
   - **Plano Premium**

3. Para cada produto, crie preços:
   - Preço mensal
   - Preço anual (opcional)

4. Atualize os `priceId` no arquivo `src/lib/stripe.ts`:

```typescript
export const STRIPE_PLANS = {
  basic: {
    prices: {
      monthly: {
        priceId: 'price_1234567890', // Substitua pelo ID real
      },
      yearly: {
        priceId: 'price_0987654321', // Substitua pelo ID real
      },
    },
  },
  // ...
}
```

## 🚀 Testando a Integração

### 1. Cartões de Teste

Use estes cartões para testar:

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### 2. Fluxo de Teste

1. Acesse `/plans`
2. Selecione um plano
3. Complete o checkout
4. Verifique se:
   - Assinatura foi criada no Stripe
   - Dados foram salvos no banco
   - Webhooks foram processados
   - Usuário tem acesso às funcionalidades

## 📊 Monitoramento

### Logs de Webhook

Verifique os logs de webhook em:
- Dashboard do Stripe > Developers > Webhooks > [seu endpoint]
- Tabela `stripe_webhook_events` no banco de dados
- Logs da aplicação

### Métricas Importantes

- Taxa de sucesso de webhooks
- Tempo de resposta dos endpoints
- Falhas de pagamento
- Cancelamentos de assinatura

## 🔒 Segurança

### Boas Práticas

1. **Nunca** exponha a Secret Key no frontend
2. Sempre valide assinaturas de webhook
3. Use HTTPS em produção
4. Monitore tentativas de fraude
5. Implemente rate limiting

### Validação de Webhook

```typescript
// A validação é feita automaticamente na API
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Webhook não está sendo recebido
- Verifique se a URL está correta
- Confirme se o endpoint está acessível
- Verifique os logs do Stripe Dashboard

#### Erro de assinatura de webhook
- Confirme se `STRIPE_WEBHOOK_SECRET` está correto
- Verifique se não há middleware modificando o body

#### Pagamento não está sendo processado
- Verifique se as chaves de API estão corretas
- Confirme se os produtos/preços existem no Stripe
- Verifique logs da aplicação

### Comandos Úteis

```bash
# Verificar status dos webhooks
npm run stripe:webhook list

# Testar webhook localmente
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Verificar logs do Stripe CLI
stripe logs tail
```

## 📚 Recursos Adicionais

- [Documentação do Stripe](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhooks do Stripe](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs da aplicação
2. Consulte o Dashboard do Stripe
3. Revise este documento
4. Entre em contato com o suporte técnico

---

**Nota**: Este documento assume que você está usando o modo de teste do Stripe. Para produção, substitua as chaves de teste pelas chaves de produção e configure webhooks para o domínio de produção.