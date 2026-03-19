'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditCard,
  Settings,
  History,
  Loader2,
  ArrowLeft,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SubscriptionManager from '@/components/stripe/SubscriptionManager'
import { User } from '@supabase/supabase-js'

export default function SubscriptionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      setUser(user)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenBillingPortal = async () => {
    try {
      setSupportLoading(true)
      setSupportError('')

      const response = await fetch('/api/stripe/checkout?action=billing_portal')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao abrir portal de cobrança')
      }

      window.open(data.portalUrl, '_blank')
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : 'Erro ao abrir portal de cobrança')
    } finally {
      setSupportLoading(false)
    }
  }

  const handleGeneralSupport = () => {
    window.location.href = 'mailto:contato@marcaedeixa.com?subject=D%C3%BAvidas%20Gerais%20sobre%20Assinatura'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assinatura</h1>
                <p className="text-gray-600">Gerencie sua assinatura e pagamentos</p>
              </div>
            </div>
            <Button onClick={() => router.push('/plans')}>
              <Plus className="h-4 w-4 mr-2" />
              Ver Planos
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {supportError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <Settings className="h-4 w-4" />
            <AlertDescription className="text-red-800">{supportError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cobrança
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SubscriptionManager userId={user.id} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Cobrança</CardTitle>
                <CardDescription>
                  Gerencie seus métodos de pagamento e informações de cobrança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Use o botão "Gerenciar Cobrança" na aba "Visão Geral" para acessar 
                    o portal seguro do Stripe onde você pode atualizar seus métodos de pagamento, 
                    baixar faturas e gerenciar suas informações de cobrança.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
                <CardDescription>
                  Visualize todas as suas transações e faturas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <History className="h-4 w-4" />
                  <AlertDescription>
                    O histórico detalhado de pagamentos está disponível na aba "Visão Geral". 
                    Para acessar faturas completas e relatórios detalhados, use o portal de cobrança.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Precisa de Ajuda?</CardTitle>
            <CardDescription>
              Estamos aqui para ajudar com qualquer dúvida sobre sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <CreditCard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">Problemas de Pagamento</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Dificuldades com cobrança ou métodos de pagamento
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBillingPortal}
                  disabled={supportLoading}
                >
                  {supportLoading ? 'Abrindo...' : 'Abrir Cobrança'}
                </Button>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Settings className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">Mudança de Plano</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Quer fazer upgrade ou downgrade do seu plano
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/plans')}
                >
                  Ver Planos
                </Button>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <History className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">Dúvidas Gerais</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Outras questões sobre sua conta ou assinatura
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneralSupport}
                >
                  Falar com Suporte
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
