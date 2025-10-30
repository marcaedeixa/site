'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export default function DebugAuth() {
  const { user, loading } = useAuth()
  const [envVars, setEnvVars] = useState({})

  useEffect(() => {
    // Verificar variáveis de ambiente no cliente
    setEnvVars({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Presente' : 'Ausente'
    })
  }, [])

  // Elemento de debug removido
  return null
}