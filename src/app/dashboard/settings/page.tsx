'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  User,
  CreditCard,
  BarChart3,
  AlertTriangle,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUserPlan } from '@/hooks/useUserPlan'
import { PLANS } from '@/lib/plan-config'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut, updateProfile, updatePassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [projectCount, setProjectCount] = useState(0)
  const userPlan = useUserPlan(user ?? null)
  
  // Estados dos formulários
  const [personalData, setPersonalData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setPersonalData(prev => ({
        ...prev,
        name: user.user_metadata?.name || '',
        email: user.email || ''
      }))
    }
  }, [user])

  // Fetch project count
  useEffect(() => {
    if (user?.id) {
      const supabase = createClient()
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => {
          setProjectCount(count || 0)
        })
    }
  }, [user?.id])

  const handlePersonalDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Validações
      if (personalData.newPassword && personalData.newPassword !== personalData.confirmPassword) {
        alert('As senhas não coincidem')
        return
      }
      
      if (personalData.newPassword && personalData.newPassword.length < 6) {
        alert('A nova senha deve ter pelo menos 6 caracteres')
        return
      }
      
      // Atualizar perfil (nome e email)
      if (personalData.name !== user?.user_metadata?.name || personalData.email !== user?.email) {
        const profileResult = await updateProfile({
          display_name: personalData.name,
          email: personalData.email
        })
        
        if (profileResult.error) {
          throw new Error(profileResult.error.message)
        }
      }
      
      // Atualizar senha se fornecida
      if (personalData.newPassword && personalData.currentPassword) {
        const passwordResult = await updatePassword(personalData.newPassword)
        
        if (passwordResult.error) {
          throw new Error(passwordResult.error.message)
        }
        
        // Limpar campos de senha após sucesso
        setPersonalData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      }
      
      alert('Dados atualizados com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar dados:', error)
      alert(`Erro ao atualizar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAccount = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao cancelar conta')
      }

      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao cancelar conta:', error)
      alert(`Erro ao cancelar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
      setShowCancelDialog(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              className="flex items-center gap-2 mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plano
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Limites
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Zona de Perigo
            </TabsTrigger>
          </TabsList>

          {/* Dados Pessoais */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e credenciais de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePersonalDataSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={personalData.name}
                        onChange={(e) => setPersonalData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={personalData.email}
                        onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Alterar Senha</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Senha Atual</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={personalData.currentPassword}
                            onChange={(e) => setPersonalData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Senha atual"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={personalData.newPassword}
                          onChange={(e) => setPersonalData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Nova senha"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={personalData.confirmPassword}
                          onChange={(e) => setPersonalData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirmar nova senha"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plano */}
          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Plano Atual</CardTitle>
                <CardDescription>
                  Gerencie sua assinatura e planos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{userPlan.plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{userPlan.plan.description}</p>
                    </div>
                    <Badge variant="secondary">Atual</Badge>
                  </div>

                  {!userPlan.isPro && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Plano Pro</CardTitle>
                        <CardDescription>R$ 5,00/mês</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>• {PLANS.pro.limits.maxActorsPerProject} atores por projeto</li>
                          <li>• {PLANS.pro.limits.maxObjectsPerProject} objetos por projeto</li>
                          <li>• {PLANS.pro.limits.maxScenesPerProject} cenas por projeto</li>
                          <li>• {PLANS.pro.limits.maxProjects} projetos</li>
                          <li>• Caixas de texto, formas e setas ilimitadas</li>
                        </ul>
                        <Button className="w-full mt-4" onClick={() => router.push('/plans')}>
                          Fazer Upgrade
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {userPlan.isPro && (
                    <Button className="w-full" onClick={() => router.push('/dashboard/subscription')}>
                      Gerenciar Assinatura
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Limites */}
          <TabsContent value="limits">
            <Card>
              <CardHeader>
                <CardTitle>Limites de Uso</CardTitle>
                <CardDescription>
                  Acompanhe seu uso atual e limites do plano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Plano Atual</h3>
                      <p className="text-sm text-muted-foreground">{userPlan.plan.name}</p>
                    </div>
                    <Badge>{userPlan.tier === 'pro' ? 'Pro' : 'Gratuito'}</Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Projetos</span>
                        <span className="text-sm text-muted-foreground">{projectCount} / {userPlan.limits.maxProjects}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min((projectCount / userPlan.limits.maxProjects) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Atores por projeto</span>
                        <span className="text-sm text-muted-foreground">Até {userPlan.limits.maxActorsPerProject}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Limite máximo de atores que você pode adicionar em cada projeto</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Objetos por projeto</span>
                        <span className="text-sm text-muted-foreground">Até {userPlan.limits.maxObjectsPerProject}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Limite máximo de objetos que você pode adicionar em cada projeto</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Cenas por projeto</span>
                        <span className="text-sm text-muted-foreground">Até {userPlan.limits.maxScenesPerProject}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Limite máximo de cenas que você pode criar em cada projeto</p>
                    </div>
                  </div>

                  {userPlan.tier === 'free' && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">
                        💡 <strong>Dica:</strong> Faça upgrade para o Plano Pro para ter mais projetos e limites maiores.
                      </p>
                      <Button onClick={() => router.push('/plans')} className="w-full">
                        Fazer Upgrade
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zona de Perigo */}
          <TabsContent value="danger">
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
                <CardDescription>
                  Ações irreversíveis que afetam permanentemente sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 border border-destructive rounded-lg">
                    <h3 className="font-medium text-destructive mb-2">Cancelar Conta</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ao cancelar sua conta, todos os seus projetos e dados serão permanentemente excluídos. 
                      Esta ação não pode ser desfeita.
                    </p>
                    
                    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Cancelar Conta
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tem certeza que deseja cancelar sua conta?</DialogTitle>
                          <DialogDescription>
                            Esta ação é irreversível. Todos os seus projetos, dados e configurações 
                            serão permanentemente excluídos.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                            Cancelar
                          </Button>
                          <Button variant="destructive" onClick={handleCancelAccount}>
                            Sim, cancelar conta
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}