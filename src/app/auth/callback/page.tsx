'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      try {
        // Verificar se há parâmetros de autenticação na URL
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Erro na confirmação do email')
          return
        }

        if (code) {
          // Trocar o código por uma sessão
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            setStatus('error')
            setMessage('Erro ao confirmar email: ' + exchangeError.message)
            return
          }

          if (data.user) {
            setStatus('success')
            setMessage('Email confirmado com sucesso! Você será redirecionado para o dashboard.')
            
            // Redirecionar após 3 segundos
            setTimeout(() => {
              router.push('/dashboard')
            }, 3000)
          }
        } else {
          // Verificar se o usuário já está autenticado
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            setStatus('success')
            setMessage('Você já está autenticado! Redirecionando...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          } else {
            setStatus('error')
            setMessage('Link de confirmação inválido ou expirado')
          }
        }
      } catch (error) {
        console.error('Erro no callback de autenticação:', error)
        setStatus('error')
        setMessage('Erro inesperado durante a confirmação')
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  const handleReturnToLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center">
            {status === 'loading' && (
              <div className="bg-blue-100">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            )}
          </div>
          
          <CardTitle>
            {status === 'loading' && 'Confirmando email...'}
            {status === 'success' && 'Email confirmado!'}
            {status === 'error' && 'Erro na confirmação'}
          </CardTitle>
          
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {status === 'error' && (
            <div className="space-y-4">
              <Button 
                onClick={handleReturnToLogin}
                className="w-full"
              >
                Voltar para o Login
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Problemas com a confirmação?{' '}
                  <button 
                    onClick={() => router.push('/login')}
                    className="text-blue-600 hover:underline"
                  >
                    Tente fazer login novamente
                  </button>
                </p>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Redirecionando automaticamente...
              </p>
              <Button 
                onClick={() => router.push('/dashboard')}
                className="w-full mt-4"
              >
                Ir para o Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}