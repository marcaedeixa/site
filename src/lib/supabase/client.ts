import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // createBrowserClient do @supabase/ssr armazena sessão em cookies
  // (acessível pelo middleware e server components) e é singleton por padrão.
  // Em Docker, o entrypoint.sh injeta os valores reais no bundle em runtime.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Cliente administrativo — no frontend usa anon key (mesma sessão).
// Operações admin reais devem passar por API routes com service role key.
export function createAdminClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
