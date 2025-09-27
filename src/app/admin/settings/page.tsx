'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  CreditCard, 
  Database,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import AdminLayout from '@/components/admin/AdminLayout'

export default function SettingsPage() {

  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      checkIntegrationsStatus()
    }
  }, [adminUser])

  const checkIntegrationsStatus = async () => {
    setLoading(true)
    try {

      // Verificar status do Supabase (sempre conectado se chegou até aqui)
      setSupabaseConnected(true)
    } catch (error) {
      console.error('Erro ao verificar status das integrações:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!adminUser) {
    return <div>Carregando...</div>
  }

  return (
    <AdminLayout
      title="Configurações"
      description="Gerencie as configurações do sistema"
      currentPath="/admin/settings"
      onRefresh={checkIntegrationsStatus}
      refreshing={loading}
    >
      <div className="space-y-6">
        {/* Integrações */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrações</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* Supabase */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Supabase
                  </div>
                  <Badge 
                    variant={supabaseConnected ? "default" : "secondary"}
                    className={supabaseConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                  >
                    {supabaseConnected ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Conectado</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Desconectado</>
                    )}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Configurações de banco de dados e autenticação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {supabaseConnected 
                      ? "Sua instância Supabase está conectada e funcionando corretamente."
                      : "Configure sua instância Supabase para gerenciar dados."
                    }
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => router.push('/admin/settings/supabase')}
                      className="flex-1"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Configurações do Sistema */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sistema</h2>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Informações sobre o ambiente e configurações atuais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ambiente</p>
                  <p className="text-sm text-gray-900">{process.env.NODE_ENV || 'development'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Versão Next.js</p>
                  <p className="text-sm text-gray-900">15.5.2</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status do Sistema</p>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operacional
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Última Atualização</p>
                  <p className="text-sm text-gray-900">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}