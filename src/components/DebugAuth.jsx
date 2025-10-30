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

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🔍 Debug Auth</h4>
      <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
      <div><strong>User ID:</strong> {user?.id || 'null'}</div>
      <div><strong>User Email:</strong> {user?.email || 'null'}</div>
      <div><strong>Supabase URL:</strong> {envVars.supabaseUrl || 'undefined'}</div>
      <div><strong>Supabase Key:</strong> {envVars.supabaseAnonKey}</div>
    </div>
  )
}