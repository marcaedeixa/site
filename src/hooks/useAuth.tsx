import { useState, useEffect, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ data?: User | null; error?: Error | null }>
  signUp: (email: string, password: string) => Promise<{ data?: User | null; error?: Error | null }>
  updateProfile: (updates: { display_name?: string; email?: string }) => Promise<{ data?: User | null; error?: Error | null }>
  updatePassword: (password: string) => Promise<{ data?: User | null; error?: Error | null }>
  requireAuth: (redirectTo?: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function useAuthState(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  const updateProfile = async (updates: { display_name?: string; email?: string }) => {
    const { data, error } = await supabase.auth.updateUser({
      email: updates.email,
      data: { display_name: updates.display_name }
    })
    return { data, error }
  }

  const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error }
  }

  const requireAuth = (redirectTo: string = '/login') => {
    if (typeof window === 'undefined') return
    // Só redireciona quando terminar de carregar o estado de auth
    if (!loading && !user) {
      window.location.href = redirectTo
    }
  }

  return { user, loading, signOut, signIn, signUp, updateProfile, updatePassword, requireAuth }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook utilitário para exigir autenticação em componentes
export function useRequireAuth(options?: { redirectTo?: string; onAuthenticated?: (user: User) => void }) {
  const { user, loading, requireAuth } = useAuth()
  useEffect(() => {
    if (!loading) {
      if (!user) {
        requireAuth(options?.redirectTo ?? '/login')
      } else {
        options?.onAuthenticated?.(user)
      }
    }
  }, [user, loading])

  return { user, loading }
}