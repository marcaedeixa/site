'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Só inicializar se o Supabase estiver configurado
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Função de login
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      // Simular login para demonstração
      const mockUser = {
        id: '1',
        email: email,
        user_metadata: { name: 'Usuário Demo' }
      }
      setUser(mockUser)
      return { data: { user: mockUser }, error: null }
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('Erro no login:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Função de registro
  const signUp = async (email, password, name) => {
    if (!isSupabaseConfigured) {
      // Simular registro para demonstração
      const mockUser = {
        id: '1',
        email: email,
        user_metadata: { name: name }
      }
      setUser(mockUser)
      return { data: { user: mockUser }, error: null }
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          }
        }
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('Erro no registro:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Função de logout
  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      setSession(null)
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para reset de senha
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase não está configurado. Configure as variáveis de ambiente.' } }
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      return { data: null, error }
    }
  }

  // Função para atualizar perfil do usuário
  const updateProfile = async (updates) => {
    if (!isSupabaseConfigured) {
      // Simular atualização para demonstração
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      return { data: { user: updatedUser }, error: null }
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.updateUser({
        email: updates.email,
        data: {
          name: updates.name,
        }
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Função para atualizar senha
  const updatePassword = async (currentPassword, newPassword) => {
    if (!isSupabaseConfigured) {
      // Simular atualização para demonstração
      return { data: null, error: null }
    }

    try {
      setLoading(true)
      
      // Primeiro, verificar a senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      
      if (signInError) {
        return { data: null, error: { message: 'Senha atual incorreta' } }
      }
      
      // Atualizar a senha
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('Erro ao atualizar senha:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}