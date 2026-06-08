'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  last_login?: string
}

interface AdminAuthContextType {
  adminUser: AdminUser | null
  loading: boolean
  signIn: (email: string, password: string, recaptchaToken: string) => Promise<{ data?: AdminUser | null; error?: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: { name?: string; email?: string }) => Promise<{ data?: AdminUser | null; error?: Error | null }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ data?: boolean; error?: Error | null }>
  lockAccount: (adminUserId: string) => Promise<{ error?: Error | null }>
  unlockAccount: (adminUserId: string) => Promise<{ error?: Error | null }>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Verificar sessão inicial
    getSession()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await loadAdminUser(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setAdminUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await loadAdminUser(session.user.id)
      }
    } catch (error) {
      console.error('Erro ao obter sessão:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, name, role, is_active, last_login')
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (error) throw error
      setAdminUser(data)
    } catch (error) {
      console.error('Erro ao carregar usuário admin:', error)
      setAdminUser(null)
    }
  }

  const signIn = async (email: string, password: string, recaptchaToken: string) => {
    try {
      setLoading(true)

      // Fazer login via API route que usa service role
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro no login')
      }

      // Definir sessão no Supabase Auth
      if (data.session) {
        await Promise.race([
          supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          }),
          new Promise((resolve) => {
            setTimeout(resolve, 2000)
          })
        ])
      }

      setAdminUser(data.user)
      return { data: data.user, error: null }
    } catch (error) {
      console.error('Erro no login admin:', error)
      return { data: null, error: error as Error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      if (adminUser) {
        await logAdminAction(adminUser.id, 'LOGOUT')
      }
      await supabase.auth.signOut()
      setAdminUser(null)
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  const updateProfile = async (updates: { name?: string; email?: string }) => {
    try {
      if (!adminUser) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', adminUser.id)
        .select()
        .single()

      if (error) throw error

      const updatedUser = { ...adminUser, ...updates }
      setAdminUser(updatedUser)
      await logAdminAction(adminUser.id, 'PROFILE_UPDATE', { updates })

      return { data: updatedUser, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!adminUser) throw new Error('Usuário não autenticado')

      // Verificar senha atual
      const { data: userData, error: fetchError } = await supabase
        .from('admin_users')
        .select('password_hash')
        .eq('id', adminUser.id)
        .single()

      if (fetchError || !userData) throw new Error('Erro ao verificar senha atual')

      const passwordMatch = await bcrypt.compare(currentPassword, userData.password_hash)
      if (!passwordMatch) {
        throw new Error('Senha atual incorreta')
      }

      // Hash da nova senha
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

      // Atualizar senha
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: newPasswordHash })
        .eq('id', adminUser.id)

      if (updateError) throw updateError

      await logAdminAction(adminUser.id, 'PASSWORD_CHANGE')
      return { data: true, error: null }
    } catch (error) {
      return { data: false, error: error as Error }
    }
  }

  const lockAccount = async (adminUserId: string) => {
    try {
      if (!adminUser || adminUser.role !== 'super_admin') {
        throw new Error('Permissão negada')
      }

      const lockUntil = new Date()
      lockUntil.setHours(lockUntil.getHours() + 24) // Bloquear por 24 horas

      const { error } = await supabase
        .from('admin_users')
        .update({ locked_until: lockUntil.toISOString() })
        .eq('id', adminUserId)

      if (error) throw error

      await logAdminAction(adminUser.id, 'ACCOUNT_LOCKED', { target_user_id: adminUserId })
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const unlockAccount = async (adminUserId: string) => {
    try {
      if (!adminUser || adminUser.role !== 'super_admin') {
        throw new Error('Permissão negada')
      }

      const { error } = await supabase
        .from('admin_users')
        .update({
          locked_until: null,
          login_attempts: 0
        })
        .eq('id', adminUserId)

      if (error) throw error

      await logAdminAction(adminUser.id, 'ACCOUNT_UNLOCKED', { target_user_id: adminUserId })
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Função auxiliar para logs
  const logAdminAction = async (adminUserId: string, action: string, details?: Record<string, unknown>) => {
    try {
      await supabase
        .from('admin_access_logs')
        .insert({
          admin_user_id: adminUserId,
          action,
          details,
          ip_address: 'unknown',
          user_agent: 'unknown'
        })
    } catch (error) {
      console.error('Erro ao registrar ação admin:', error)
    }
  }

  const value = {
    adminUser,
    loading,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    lockAccount,
    unlockAccount
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
