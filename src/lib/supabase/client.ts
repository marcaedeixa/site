import { createBrowserClient } from '@supabase/ssr'

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

function getClientConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    return { supabaseUrl, supabaseAnonKey }
  }

  return {
    supabaseUrl: FALLBACK_SUPABASE_URL,
    supabaseAnonKey: FALLBACK_SUPABASE_ANON_KEY,
  }
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getClientConfig()
  // createBrowserClient do @supabase/ssr armazena sessão em cookies
  // (acessível pelo middleware e server components) e é singleton por padrão
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente administrativo — no frontend usa anon key (mesma sessão)
// Operações admin reais devem passar por API routes com service role key
export function createAdminClient() {
  const { supabaseUrl, supabaseAnonKey } = getClientConfig()
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
