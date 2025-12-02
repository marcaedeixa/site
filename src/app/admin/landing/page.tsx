'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Save,
  RefreshCw,
  Eye,
  Type,
  Image,
  Video,
  Link,
  Plus,
  Trash2,
  Check,
  Loader2,
  ExternalLink,
  LayoutDashboard,
  FileText,
  Sparkles,
  HelpCircle,
  Megaphone
} from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface LandingContent {
  hero?: {
    content: {
      badge: string
      title_line1: string
      title_line2: string
      title_line3: string
      description: string
      cta_primary: string
      cta_secondary: string
      social_proof_count: string
      social_proof_text: string
    }
    updated_at: string
  }
  about?: {
    content: {
      title: string
      description: string
      stats: Array<{ value: string; label: string }>
      cards: Array<{ title: string; description: string; icon: string }>
    }
    updated_at: string
  }
  features?: {
    content: {
      title: string
      description: string
      items: Array<{ title: string; description: string; icon: string }>
    }
    updated_at: string
  }
  cta?: {
    content: {
      title: string
      description: string
      button_text: string
    }
    updated_at: string
  }
  footer?: {
    content: {
      description: string
      contact_email: string
    }
    updated_at: string
  }
  media?: {
    content: {
      hero_video_url: string
      hero_image_url: string
      demo_video_url: string
    }
    updated_at: string
  }
  links?: {
    content: {
      terms_url: string
      privacy_url: string
      support_url: string
      documentation_url: string
    }
    updated_at: string
  }
}

export default function LandingContentPage() {
  const [content, setContent] = useState<LandingContent>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('hero')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()

  useEffect(() => {
    if (!authLoading && !adminUser) {
      router.push('/admin/login')
    }
  }, [authLoading, adminUser, router])

  useEffect(() => {
    if (adminUser) {
      loadContent()
    }
  }, [adminUser])

  const loadContent = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/landing-content')
      if (response.ok) {
        const data = await response.json()
        setContent(data)
      }
    } catch (error) {
      console.error('Error loading content:', error)
      setErrorMessage('Erro ao carregar conteúdo')
    } finally {
      setLoading(false)
    }
  }

  const saveSection = async (section: string, sectionContent: any) => {
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')
    
    try {
      const response = await fetch('/api/admin/landing-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          content: sectionContent,
          updated_by: adminUser?.id,
        }),
      })

      if (response.ok) {
        setSuccessMessage(`Seção "${section}" salva com sucesso!`)
        loadContent()
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrorMessage('Erro ao salvar conteúdo')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      setErrorMessage('Erro ao salvar conteúdo')
    } finally {
      setSaving(false)
    }
  }

  const updateContentField = (section: string, field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof LandingContent],
        content: {
          ...(prev[section as keyof LandingContent]?.content || {}),
          [field]: value,
        },
      },
    }))
  }

  const updateArrayItem = (section: string, arrayField: string, index: number, field: string, value: string) => {
    setContent(prev => {
      const sectionData = prev[section as keyof LandingContent]
      if (!sectionData) return prev
      
      const array = [...((sectionData.content as any)[arrayField] || [])]
      array[index] = { ...array[index], [field]: value }
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          content: {
            ...sectionData.content,
            [arrayField]: array,
          },
        },
      }
    })
  }

  const addArrayItem = (section: string, arrayField: string, defaultItem: any) => {
    setContent(prev => {
      const sectionData = prev[section as keyof LandingContent]
      if (!sectionData) return prev
      
      const array = [...((sectionData.content as any)[arrayField] || []), defaultItem]
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          content: {
            ...sectionData.content,
            [arrayField]: array,
          },
        },
      }
    })
  }

  const removeArrayItem = (section: string, arrayField: string, index: number) => {
    setContent(prev => {
      const sectionData = prev[section as keyof LandingContent]
      if (!sectionData) return prev
      
      const array = [...((sectionData.content as any)[arrayField] || [])]
      array.splice(index, 1)
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          content: {
            ...sectionData.content,
            [arrayField]: array,
          },
        },
      }
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gerenciar Landing Page</h1>
                <p className="text-sm text-gray-600">Edite textos, imagens e links da página inicial</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/', '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Visualizar Site
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadContent}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white border p-1 rounded-xl">
            <TabsTrigger value="hero" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <LayoutDashboard className="w-4 h-4" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <FileText className="w-4 h-4" />
              Sobre
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <Sparkles className="w-4 h-4" />
              Recursos
            </TabsTrigger>
            <TabsTrigger value="cta" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <Megaphone className="w-4 h-4" />
              CTA
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <Video className="w-4 h-4" />
              Mídia
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white rounded-lg">
              <Link className="w-4 h-4" />
              Links
            </TabsTrigger>
          </TabsList>

          {/* Hero Section */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5" />
                  Seção Hero (Principal)
                </CardTitle>
                <CardDescription>
                  A primeira seção que os visitantes veem ao acessar o site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Badge (etiqueta no topo)</Label>
                  <Input
                    value={content.hero?.content?.badge || ''}
                    onChange={(e) => updateContentField('hero', 'badge', e.target.value)}
                    placeholder="Ex: Novo: Editor v2.0 disponível"
                    className="mt-1"
                  />
                </div>

                <Separator />
                <h4 className="font-semibold">Título Principal</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Linha 1</Label>
                    <Input
                      value={content.hero?.content?.title_line1 || ''}
                      onChange={(e) => updateContentField('hero', 'title_line1', e.target.value)}
                      placeholder="Crie histórias"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Linha 2 (destaque)</Label>
                    <Input
                      value={content.hero?.content?.title_line2 || ''}
                      onChange={(e) => updateContentField('hero', 'title_line2', e.target.value)}
                      placeholder="visuais"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Linha 3</Label>
                    <Input
                      value={content.hero?.content?.title_line3 || ''}
                      onChange={(e) => updateContentField('hero', 'title_line3', e.target.value)}
                      placeholder="incríveis"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={content.hero?.content?.description || ''}
                    onChange={(e) => updateContentField('hero', 'description', e.target.value)}
                    placeholder="O editor mais intuitivo para criar apresentações..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Separator />
                <h4 className="font-semibold">Botões de Ação</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Botão Principal</Label>
                    <Input
                      value={content.hero?.content?.cta_primary || ''}
                      onChange={(e) => updateContentField('hero', 'cta_primary', e.target.value)}
                      placeholder="Começar Grátis"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Botão Secundário</Label>
                    <Input
                      value={content.hero?.content?.cta_secondary || ''}
                      onChange={(e) => updateContentField('hero', 'cta_secondary', e.target.value)}
                      placeholder="Ver Demo"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />
                <h4 className="font-semibold">Prova Social</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={content.hero?.content?.social_proof_count || ''}
                      onChange={(e) => updateContentField('hero', 'social_proof_count', e.target.value)}
                      placeholder="+1.000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Texto</Label>
                    <Input
                      value={content.hero?.content?.social_proof_text || ''}
                      onChange={(e) => updateContentField('hero', 'social_proof_text', e.target.value)}
                      placeholder="criadores já estão usando"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => saveSection('hero', content.hero?.content)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Hero
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Section */}
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Seção Sobre
                </CardTitle>
                <CardDescription>
                  Informações sobre a empresa e estatísticas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={content.about?.content?.title || ''}
                    onChange={(e) => updateContentField('about', 'title', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={content.about?.content?.description || ''}
                    onChange={(e) => updateContentField('about', 'description', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Estatísticas</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('about', 'stats', { value: '', label: '' })}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {content.about?.content?.stats?.map((stat, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Input
                        placeholder="Valor (ex: 1k+)"
                        value={stat.value}
                        onChange={(e) => updateArrayItem('about', 'stats', index, 'value', e.target.value)}
                        className="w-32"
                      />
                      <Input
                        placeholder="Label (ex: Usuários ativos)"
                        value={stat.label}
                        onChange={(e) => updateArrayItem('about', 'stats', index, 'label', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem('about', 'stats', index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => saveSection('about', content.about?.content)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Sobre
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Section */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Seção Recursos
                </CardTitle>
                <CardDescription>
                  Funcionalidades e recursos do produto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={content.features?.content?.title || ''}
                    onChange={(e) => updateContentField('features', 'title', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={content.features?.content?.description || ''}
                    onChange={(e) => updateContentField('features', 'description', e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Lista de Recursos</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('features', 'items', { title: '', description: '', icon: 'sparkles' })}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Recurso
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {content.features?.content?.items?.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Recurso {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem('features', 'items', index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          placeholder="Título"
                          value={item.title}
                          onChange={(e) => updateArrayItem('features', 'items', index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Ícone (eye, users, layers, etc)"
                          value={item.icon}
                          onChange={(e) => updateArrayItem('features', 'items', index, 'icon', e.target.value)}
                        />
                      </div>
                      <Input
                        placeholder="Descrição"
                        value={item.description}
                        onChange={(e) => updateArrayItem('features', 'items', index, 'description', e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => saveSection('features', content.features?.content)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Recursos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CTA Section */}
          <TabsContent value="cta">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Seção CTA (Call to Action)
                </CardTitle>
                <CardDescription>
                  Seção final com chamada para ação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={content.cta?.content?.title || ''}
                    onChange={(e) => updateContentField('cta', 'title', e.target.value)}
                    placeholder="Pronto para começar?"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={content.cta?.content?.description || ''}
                    onChange={(e) => updateContentField('cta', 'description', e.target.value)}
                    placeholder="Junte-se a milhares de criadores..."
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Texto do Botão</Label>
                  <Input
                    value={content.cta?.content?.button_text || ''}
                    onChange={(e) => updateContentField('cta', 'button_text', e.target.value)}
                    placeholder="Começar Agora — É Grátis"
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => saveSection('cta', content.cta?.content)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar CTA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Section */}
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Mídia
                </CardTitle>
                <CardDescription>
                  URLs de vídeos e imagens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>URL do Vídeo Hero</Label>
                  <Input
                    value={content.media?.content?.hero_video_url || ''}
                    onChange={(e) => updateContentField('media', 'hero_video_url', e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Vídeo exibido na seção principal</p>
                </div>

                <div>
                  <Label>URL da Imagem Hero</Label>
                  <Input
                    value={content.media?.content?.hero_image_url || ''}
                    onChange={(e) => updateContentField('media', 'hero_image_url', e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Imagem de fundo ou destaque</p>
                </div>

                <div>
                  <Label>URL do Vídeo Demo</Label>
                  <Input
                    value={content.media?.content?.demo_video_url || ''}
                    onChange={(e) => updateContentField('media', 'demo_video_url', e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Vídeo demonstrativo do produto</p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => saveSection('media', content.media?.content)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Mídia
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Section */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Links
                </CardTitle>
                <CardDescription>
                  URLs de páginas importantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Termos de Uso</Label>
                    <Input
                      value={content.links?.content?.terms_url || ''}
                      onChange={(e) => updateContentField('links', 'terms_url', e.target.value)}
                      placeholder="/termos"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Política de Privacidade</Label>
                    <Input
                      value={content.links?.content?.privacy_url || ''}
                      onChange={(e) => updateContentField('links', 'privacy_url', e.target.value)}
                      placeholder="/privacidade"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Suporte</Label>
                    <Input
                      value={content.links?.content?.support_url || ''}
                      onChange={(e) => updateContentField('links', 'support_url', e.target.value)}
                      placeholder="/suporte"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Documentação</Label>
                    <Input
                      value={content.links?.content?.documentation_url || ''}
                      onChange={(e) => updateContentField('links', 'documentation_url', e.target.value)}
                      placeholder="/docs"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => saveSection('links', content.links?.content)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Links
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

