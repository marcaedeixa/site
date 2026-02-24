'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useTrialStatus, hasSubscriptionAccess, getStatusMessage, getStatusColor } from '@/hooks/useTrialStatus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Lock, 
  AlertTriangle, 
  Crown, 
  Clock, 
  ArrowRight,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubscriptionGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgradeModal?: boolean
  redirectOnBlock?: boolean
  redirectUrl?: string
}

export default function SubscriptionGate({
  children,
  fallback,
  showUpgradeModal = true,
  redirectOnBlock = false,
  redirectUrl = '/plans',
}: SubscriptionGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const trialStatus = useTrialStatus(user)
  const hasAccess = hasSubscriptionAccess(trialStatus)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setUserLoading(false)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    // Handle blocked users
    if (!userLoading && !trialStatus.isLoading && !hasAccess) {
      if (redirectOnBlock) {
        router.push(redirectUrl)
      } else if (showUpgradeModal) {
        setShowModal(true)
      }
    }
  }, [userLoading, trialStatus.isLoading, hasAccess, redirectOnBlock, showUpgradeModal, redirectUrl, router])

  // Loading state
  if (userLoading || trialStatus.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando assinatura...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Faça login para acessar esta funcionalidade
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => router.push('/login')}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Fazer Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Has access
  if (hasAccess) {
    return <>{children}</>
  }

  // No access - show fallback or modal
  if (fallback) {
    return <>{fallback}</>
  }

  // Upgrade Modal
  if (showModal) {
    return (
      <>
        {children}
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          status={trialStatus}
        />
      </>
    )
  }

  // Default blocked view
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle>{trialStatus.isTrialing ? 'Período de Teste Expirado' : 'Assinatura Necessária'}</CardTitle>
          <CardDescription>
            {getStatusMessage(trialStatus)}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 text-sm">
            Para continuar utilizando o editor, escolha um de nossos planos.
          </p>
          <Button 
            onClick={() => router.push('/plans')}
            className="bg-violet-600 hover:bg-violet-700 w-full"
          >
            <Crown className="w-4 h-4 mr-2" />
            Ver Planos
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Upgrade Modal Component
interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  status: ReturnType<typeof useTrialStatus>
}

function UpgradeModal({ isOpen, onClose, status }: UpgradeModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 px-8 py-10 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {status.isTrialing ? (
              <Clock className="w-10 h-10 text-white" />
            ) : (
              <Crown className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {status.isTrialing ? 'Seu Período de Teste Expirou' : 'Faça Upgrade Agora'}
          </h2>
          <p className="text-white/80">
            Continue criando narrativas visuais incríveis
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <Alert className={cn(
            'mb-6',
            status.isTrialing 
              ? 'border-yellow-200 bg-yellow-50' 
              : 'border-red-200 bg-red-50'
          )}>
            <AlertTriangle className={cn(
              'h-4 w-4',
              status.isTrialing ? 'text-yellow-600' : 'text-red-600'
            )} />
            <AlertDescription className={cn(
              status.isTrialing ? 'text-yellow-800' : 'text-red-800'
            )}>
              {getStatusMessage(status)}
            </AlertDescription>
          </Alert>

          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900">Com uma assinatura você terá:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Acesso ilimitado ao editor
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salve e exporte seus projetos
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Suporte técnico dedicado
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Atualizações e novos recursos
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/plans')}
              className="w-full bg-violet-600 hover:bg-violet-700 py-6 text-lg"
            >
              <Crown className="w-5 h-5 mr-2" />
              Ver Planos e Preços
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full text-gray-600"
            >
              Talvez depois
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Trial Warning Banner Component — only shows for users on free plan as a soft upgrade nudge
export function TrialWarningBanner({ user }: { user: User | null }) {
  const status = useTrialStatus(user)
  const router = useRouter()

  // Don't show banner while loading, for pro users, or if no user
  if (status.isLoading || !user) {
    return null
  }

  // Show upgrade nudge only for free users (no active subscription)
  if (status.hasActiveSubscription) {
    return null
  }

  return (
    <div className={cn('border-b px-4 py-3', 'bg-blue-50 border-blue-200')}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className={cn('w-5 h-5', 'text-blue-600')} />
          <span className={cn('text-sm font-medium', 'text-blue-800')}>
            Você está no Plano Gratuito. Faça upgrade para o Pro e tenha mais recursos!
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/plans')}
          className={cn('border-current', 'text-blue-800')}
        >
          Ver Planos
        </Button>
      </div>
    </div>
  )
}

