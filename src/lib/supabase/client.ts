import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton instances
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null
let supabaseAdminInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    // No frontend, precisamos fazer as operações admin via API routes
    // que usam a service role key no servidor
    supabaseAdminInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseAdminInstance
}