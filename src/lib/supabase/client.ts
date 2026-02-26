import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton instances
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null
let supabaseAdminInstance: ReturnType<typeof createSupabaseClient> | null = null

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
  if (!supabaseInstance) {
    const { supabaseUrl, supabaseAnonKey } = getClientConfig()

    supabaseInstance = createSupabaseClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      }
    )
  }
  return supabaseInstance
}

// Cliente administrativo com service role key (apenas para operações admin)
export function createAdminClient() {
  if (!supabaseAdminInstance) {
    const { supabaseUrl, supabaseAnonKey } = getClientConfig()

    // No frontend, precisamos fazer as operações admin via API routes
    // que usam a service role key no servidor
    supabaseAdminInstance = createSupabaseClient(
      supabaseUrl,
      supabaseAnonKey
    )
  }
  return supabaseAdminInstance
}
