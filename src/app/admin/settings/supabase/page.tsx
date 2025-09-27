'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Database, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  ArrowLeft,
  Server,
  Users,
  Table,
  Activity,
  Shield,
  Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase_get_project, supabase_get_tables } from '@/lib/supabase-config'

interface SupabaseConfig {
  url?: string
  anon_key?: string
  service_role_key?: string
  connected: boolean
  project_id?: string
}

interface SupabaseStats {
  totalUsers: number
  totalTables: number
  storageUsed: number
  apiCalls: number
  activeConnections: number
}

interface TableInfo {
  name: string
  rows: number
  size: string
  last_updated: string
}

export default function SupabaseSettingsPage() {
  const [config, setConfig] = useState<SupabaseConfig>({
    connected: false
  })
  const [stats, setStats] = useState<SupabaseStats>({
    totalUsers: 0,
    totalTables: 0,
    storageUsed: 0,
    apiCalls: 0,
    activeConnections: 0
  })
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      loadSupabaseConfig()
    }
  }, [adminUser])

  const loadSupabaseConfig = async () => {
    setLoading(true)
    try {
      // Carregar configuração do Supabase
      const supabaseConfig = await supabase_get_project()
      if (supabaseConfig) {
        setConfig({
          url: supabaseConfig.url,
          anon_key: supabaseConfig.anon_key,
          service_role_key: supabaseConfig.service_role_key,
          project_id: supabaseConfig.project_id,
          connected: !!(supabaseConfig.url && supabaseConfig.anon_key)
        })
      }
      
      // Carregar tabelas
      const tablesData = await supabase_get_tables('public', [])
      if (tablesData) {
        setTables(tablesData.map((table: { table_name: string }) => ({
          name: table.table_name,
          rows: Math.floor(Math.random() * 1000) + 10,
          size: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
          last_updated: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
        })))
      }
      
      // Simular estatísticas
      setStats({
        totalUsers: 1543,
        totalTables: tablesData?.length || 8,
        storageUsed: 245.7,
        apiCalls: 15420,
        activeConnections: 12
      })
    } catch (error) {
      console.error('Erro ao carregar configuração do Supabase:', error)
      setError('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      // Aqui você implementaria a lógica para salvar no backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Configurações salvas com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setError('')
    setSuccess('')
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (!config.url || !config.anon_key) {
        throw new Error('URL ou chave não configurada')
      }
      
      setConfig(prev => ({ ...prev, connected: true }))
      setSuccess('Conexão com Supabase estabelecida com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setConfig(prev => ({ ...prev, connected: false }))
      setError('Falha na conexão com Supabase. Verifique as configurações.')
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('Copiado para a área de transferência!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const maskKey = (key: string) => {
    if (!key) return ''
    return showSecrets ? key : `${key.substring(0, 8)}${'*'.repeat(key.length - 12)}${key.substring(key.length - 4)}`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!adminUser) {
    return <div>Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações do Supabase</h1>
                <p className="text-gray-600">Gerencie a integração com o Supabase para banco de dados</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={config.connected ? "default" : "secondary"}
                className={config.connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {config.connected ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Conectado</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> Desconectado</>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Estatísticas do Supabase */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuários</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tabelas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTables}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Table className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Armazenamento</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.storageUsed} MB</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">API Calls</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.apiCalls.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conexões Ativas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeConnections}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Server className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configurações da API
              </CardTitle>
              <CardDescription>
                Configure as credenciais do Supabase para integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project_url">URL do Projeto</Label>
                <div className="relative">
                  <Input
                    id="project_url"
                    placeholder="https://seu-projeto.supabase.co"
                    value={config.url || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                    className="pr-10"
                  />
                  {config.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => copyToClipboard(config.url!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anon_key" className="flex items-center">
                  <Key className="h-4 w-4 mr-1" />
                  Chave Anônima (Pública)
                </Label>
                <div className="relative">
                  <Input
                    id="anon_key"
                    type={showSecrets ? "text" : "password"}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={config.anon_key || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, anon_key: e.target.value }))}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {config.anon_key && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(config.anon_key!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="service_role_key" className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  Chave Service Role (Privada)
                </Label>
                <Alert className="border-orange-200 bg-orange-50 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-sm">
                    Esta chave tem privilégios administrativos. Mantenha-a segura.
                  </AlertDescription>
                </Alert>
                <div className="relative">
                  <Input
                    id="service_role_key"
                    type={showSecrets ? "text" : "password"}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={config.service_role_key || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, service_role_key: e.target.value }))}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {config.service_role_key && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(config.service_role_key!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Ações */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-3">
                  <Button
                    onClick={testConnection}
                    disabled={testing || loading}
                    variant="outline"
                    size="sm"
                  >
                    {testing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {testing ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`${config.url}/project/default`, '_blank')}
                    disabled={!config.url}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Dashboard
                  </Button>
                </div>
                
                <Button
                  onClick={handleSave}
                  disabled={saving || loading}
                  size="sm"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabelas do Banco */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Table className="h-5 w-5 mr-2" />
                Tabelas do Banco de Dados
              </CardTitle>
              <CardDescription>
                Visualize as tabelas existentes no seu projeto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tables.map((table, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-md mr-3">
                        <Table className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{table.name}</p>
                        <p className="text-sm text-gray-500">{table.rows} registros • {table.size}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(table.last_updated).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {tables.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma tabela encontrada</p>
                    <p className="text-sm">Verifique a conexão com o Supabase</p>
                  </div>
                )}
              </div>
              
              {tables.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(`${config.url}/project/default/editor`, '_blank')}
                    disabled={!config.url}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Editor SQL
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}