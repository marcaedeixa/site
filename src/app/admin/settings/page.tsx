'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import AdminLayout from '@/components/admin/AdminLayout'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)

  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      checkIntegrationsStatus()
    }
  }, [adminUser])

  const checkIntegrationsStatus = async () => {
    setLoading(true)
    try {
      await Promise.resolve()
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
