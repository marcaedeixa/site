#!/bin/sh
set -e

# Substitui placeholders NEXT_PUBLIC_* nos JS buildados pelo Next.js
# com os valores reais das env vars definidas em runtime (Dokploy, docker run, etc.)
# Isso resolve o problema de NEXT_PUBLIC_* serem inlineados no build time.

echo "🔧 Injetando variáveis de ambiente no bundle..."

find /app/.next -type f -name "*.js" -exec sed -i \
  -e "s|https://buildplaceholder.supabase.co|${NEXT_PUBLIC_SUPABASE_URL}|g" \
  -e "s|eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.buildplaceholder|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" \
  -e "s|https://buildplaceholder.app|${NEXT_PUBLIC_APP_URL}|g" \
  -e "s|pk_test_buildplaceholder|${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}|g" \
  -e "s|buildplaceholder_recaptcha|${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}|g" \
  {} +

echo "✅ Variáveis injetadas. Iniciando servidor..."

exec node server.js
