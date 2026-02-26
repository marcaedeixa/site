'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useAdminAuth } from '@/hooks/useAdminAuth'

function AdminLoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, adminUser } = useAdminAuth()
  
  const redirectUrl = searchParams.get('redirect') || '/admin'
  const urlError = searchParams.get('error')
  
  useEffect(() => {
    // Se já está autenticado, redirecionar
    if (adminUser) {
      router.push(redirectUrl)
    }
  }, [adminUser, router, redirectUrl])
  
  useEffect(() => {
    // Mostrar erro da URL
    if (urlError) {
      switch (urlError) {
        case 'unauthorized':
          setError('Acesso negado. Você não tem permissões administrativas.')
          break
        case 'system_error':
          setError('Erro do sistema. Tente novamente.')
          break
        default:
          setError('Erro desconhecido. Tente novamente.')
      }
    }
  }, [urlError])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }
    
    if (!recaptchaToken && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      setError('Por favor, complete a verificação reCAPTCHA')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const { data, error: loginError } = await signIn(email, password, recaptchaToken)
      
      if (loginError) {
        setError(loginError.message)
        // Reset reCAPTCHA em caso de erro
        recaptchaRef.current?.reset()
        setRecaptchaToken(null)
      } else if (data) {
        // Sucesso - redirecionar
        router.push(redirectUrl)
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.')
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token)
    if (token) {
      setError('') // Limpar erro quando reCAPTCHA for completado
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Marca e Deixa</h1>
          <p className="text-purple-200">Painel Administrativo</p>
        </div>
        
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Login Administrativo
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Acesse o painel de administração do sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@marcaedeixa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11"
                  autoComplete="email"
                  required
                />
              </div>
              
              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-11 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* reCAPTCHA */}
              {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center py-2">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                  onChange={handleRecaptchaChange}
                  theme="light"
                  size="normal"
                />
              </div>
              )}
              
              {/* Mensagem de Erro */}
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Botão de Login */}
              <Button
                type="submit"
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                disabled={loading || (!recaptchaToken && !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY)}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar no Painel'
                )}
              </Button>
            </form>
            
            {/* Informações de Segurança */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Acesso Seguro</p>
                  <ul className="text-xs space-y-1 text-blue-700">
                    <li>• Todas as tentativas de login são registradas</li>
                    <li>• Contas são bloqueadas após 5 tentativas falhadas</li>
                    <li>• Verificação reCAPTCHA obrigatória</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Credenciais Padrão (apenas para desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800 font-medium mb-1">Desenvolvimento:</p>
                <p className="text-xs text-yellow-700">
                  Email: admin@marcaedeixa.com<br />
                  Senha: Admin123!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-purple-200">
            © 2024 Marca e Deixa. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-purple-200">Carregando...</p>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  )
}