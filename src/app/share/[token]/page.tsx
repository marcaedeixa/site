'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Download,
  Share2,
  Layers,
  Users,
  Box,
  Loader2,
  ChevronRight,
  Eye,
  Type,
  Minus,
  ArrowRight,
  Pen,
  Circle,
  Square,
  Presentation,
  AlertTriangle,
  FileX2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────

interface ShareResponse {
  project: { name: string; description: string }
  data: {
    elements: Array<{
      id: string
      type: string
      x: number
      y: number
      width?: number
      height?: number
      [key: string]: unknown
    }>
    groups?: Array<unknown>
    viewport: { x: number; y: number; zoom: number }
    scenes?: Array<{
      name: string
      elements: Array<{
        id: string
        type: string
        x: number
        y: number
        width?: number
        height?: number
        [key: string]: unknown
      }>
      groups?: Array<unknown>
      viewport: { x: number; y: number; zoom: number }
      stageConfig?: unknown
    }>
    currentSceneIndex?: number
    stageConfig?: unknown
    lastModified: string
  } | null
}

// ─── Element helpers ─────────────────────────────────────────────────

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  rectangle: 'Retângulo',
  circle: 'Círculo',
  line: 'Linha',
  arrow: 'Seta',
  text: 'Texto',
  path: 'Desenho',
  pen: 'Caneta',
  actor: 'Ator',
  stage: 'Palco',
  object: 'Objeto',
  textbox: 'Caixa de Texto',
}

const ELEMENT_TYPE_ICONS: Record<string, React.ElementType> = {
  rectangle: Square,
  circle: Circle,
  line: Minus,
  arrow: ArrowRight,
  text: Type,
  path: Pen,
  pen: Pen,
  actor: Users,
  stage: Presentation,
  object: Box,
  textbox: Type,
}

function countElementTypes(
  elements: Array<{ type: string }>
): Record<string, number> {
  const counts: Record<string, number> = {}
  elements.forEach((el) => {
    const t = el.type || 'desconhecido'
    counts[t] = (counts[t] || 0) + 1
  })
  return counts
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

// ─── Sub-components ──────────────────────────────────────────────────

function Brand() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xl font-black tracking-tight text-black">
              marca<span className="text-gray-400">e</span>deixa
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Projeto Compartilhado</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Brand />
      <div className="flex-1 flex items-center justify-center pt-16">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
            <Loader2 className="w-16 h-16 text-black animate-spin" />
          </div>
          <p className="text-lg font-medium text-gray-600">
            Carregando projeto...
          </p>
          <p className="text-sm text-gray-400">
            Preparando a visualização
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Brand />
      <div className="flex-1 flex items-center justify-center pt-16">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
            <FileX2 className="w-10 h-10 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-black">
              Link não encontrado
            </h1>
            <p className="text-gray-500 leading-relaxed">{message}</p>
          </div>
          <Button
            onClick={() => (window.location.href = '/')}
            className="bg-black hover:bg-gray-800 text-white rounded-full px-8"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyDataState({ projectName }: { projectName: string }) {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-black">{projectName}</h2>
      <p className="text-gray-500">Este projeto não contém dados</p>
    </div>
  )
}

function TypeBadge({ type, count }: { type: string; count: number }) {
  const Icon = ELEMENT_TYPE_ICONS[type] || Box
  const label = ELEMENT_TYPE_LABELS[type] || type

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <span className="ml-auto text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
        {count}
      </span>
    </div>
  )
}

function SceneCard({
  scene,
  index,
  isActive,
  onClick,
}: {
  scene: {
    name: string
    elements: Array<{ type: string; [key: string]: unknown }>
  }
  index: number
  isActive: boolean
  onClick: () => void
}) {
  const elementCount = scene.elements?.length ?? 0
  const types = countElementTypes(scene.elements ?? [])

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 group ${
        isActive
          ? 'border-black bg-black text-white shadow-xl shadow-black/10'
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isActive ? 'text-gray-400' : 'text-gray-400'
              }`}
            >
              Cena {index + 1}
            </span>
          </div>
          <h3
            className={`font-bold text-lg truncate ${
              isActive ? 'text-white' : 'text-black'
            }`}
          >
            {scene.name || `Cena ${index + 1}`}
          </h3>
          <p
            className={`text-sm ${
              isActive ? 'text-gray-300' : 'text-gray-500'
            }`}
          >
            {elementCount} {elementCount === 1 ? 'elemento' : 'elementos'}
          </p>
        </div>
        <ChevronRight
          className={`w-5 h-5 flex-shrink-0 mt-1 transition-transform ${
            isActive
              ? 'text-gray-400 rotate-90'
              : 'text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5'
          }`}
        />
      </div>

      {/* Scene type summary — visible when active */}
      {isActive && Object.keys(types).length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex flex-wrap gap-2">
            {Object.entries(types).map(([type, count]) => (
              <span
                key={type}
                className="text-xs bg-white/10 rounded-full px-3 py-1 text-gray-300"
              >
                {ELEMENT_TYPE_LABELS[type] || type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}

// ─── Main page ───────────────────────────────────────────────────────

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = React.use(params)
  const [data, setData] = useState<ShareResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeScene, setActiveScene] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/share/${token}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError(
              'Este link de compartilhamento não existe ou expirou. Verifique se o endereço está correto.'
            )
          } else {
            setError(
              'Não foi possível carregar o projeto. Tente novamente mais tarde.'
            )
          }
          return
        }
        const json: ShareResponse = await res.json()
        setData(json)
        if (json.data?.currentSceneIndex !== undefined) {
          setActiveScene(json.data.currentSceneIndex)
        }
      } catch {
        setError('Erro de conexão. Verifique sua internet e tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  // ── Render states ──────────────────────────────────────────────────

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data || !data.data)
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Brand />
        <div className="flex-1 flex items-center justify-center pt-16 px-4">
          <EmptyDataState projectName={data?.project?.name ?? 'Projeto'} />
        </div>
      </div>
    )

  // ── Computed values ────────────────────────────────────────────────

  const projectData = data.data
  const scenes = projectData.scenes ?? []
  const hasScenes = scenes.length > 0

  // Gather all elements across all scenes for summary
  const allElements = hasScenes
    ? scenes.flatMap((s) => s.elements ?? [])
    : projectData.elements ?? []
  const totalElements = allElements.length
  const allTypes = countElementTypes(allElements)
  const typeEntries = Object.entries(allTypes).sort(
    ([, a], [, b]) => b - a
  )

  // Current scene detail
  const currentScene = hasScenes ? scenes[activeScene] : null
  const currentElements = currentScene
    ? currentScene.elements ?? []
    : projectData.elements ?? []
  const currentTypes = countElementTypes(currentElements)

  // Download handler
  function handleDownload() {
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data!.project.name || 'projeto'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <Brand />

      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-gray-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-1/3 -right-40 w-[500px] h-[500px] bg-gray-100 rounded-full blur-3xl opacity-40" />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <main className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* ── Project Header ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 text-sm font-medium text-gray-600">
              <Share2 className="w-4 h-4" />
              Este projeto foi compartilhado com você
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight leading-tight">
              {data.project.name}
            </h1>

            {data.project.description && (
              <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">
                {data.project.description}
              </p>
            )}

            {projectData.lastModified && (
              <p className="text-sm text-gray-400">
                Última atualização: {formatDate(projectData.lastModified)}
              </p>
            )}
          </div>

          {/* ── Summary Stats ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-2 border-black bg-black text-white">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black">
                    {hasScenes ? scenes.length : 1}
                  </p>
                  <p className="text-sm text-gray-400">
                    {hasScenes && scenes.length !== 1 ? 'Cenas' : 'Cena'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Box className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-3xl font-black text-black">
                    {totalElements}
                  </p>
                  <p className="text-sm text-gray-500">
                    {totalElements === 1 ? 'Elemento' : 'Elementos'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100">
              <CardContent className="flex items-center gap-4 py-0">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-3xl font-black text-black">
                    {Object.keys(allTypes).length}
                  </p>
                  <p className="text-sm text-gray-500">
                    {Object.keys(allTypes).length === 1
                      ? 'Tipo de elemento'
                      : 'Tipos de elementos'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Element Types Overview ──────────────────────────────── */}
          {typeEntries.length > 0 && (
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg text-black">
                  Composição do Projeto
                </CardTitle>
                <CardDescription>
                  Tipos de elementos utilizados em todas as cenas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {typeEntries.map(([type, count]) => (
                    <TypeBadge key={type} type={type} count={count} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Scenes ──────────────────────────────────────────────── */}
          {hasScenes && (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* Scene list sidebar */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 px-1">
                  Cenas ({scenes.length})
                </h2>
                <div className="space-y-2 lg:max-h-[600px] lg:overflow-y-auto lg:pr-2">
                  {scenes.map((scene, i) => (
                    <SceneCard
                      key={i}
                      scene={scene}
                      index={i}
                      isActive={activeScene === i}
                      onClick={() => setActiveScene(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Scene detail */}
              <Card className="border-2 border-gray-100">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {activeScene + 1}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-xl text-black truncate">
                        {currentScene?.name || `Cena ${activeScene + 1}`}
                      </CardTitle>
                      <CardDescription>
                        {currentElements.length}{' '}
                        {currentElements.length === 1
                          ? 'elemento'
                          : 'elementos'}{' '}
                        nesta cena
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {Object.keys(currentTypes).length > 0 ? (
                    <div className="space-y-4">
                      {/* Type breakdown for this scene */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(currentTypes)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, count]) => (
                            <TypeBadge
                              key={type}
                              type={type}
                              count={count}
                            />
                          ))}
                      </div>

                      {/* Visual bar chart */}
                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Distribuição
                        </p>
                        {Object.entries(currentTypes)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, count]) => {
                            const pct =
                              currentElements.length > 0
                                ? (count / currentElements.length) * 100
                                : 0
                            return (
                              <div key={type} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 font-medium">
                                    {ELEMENT_TYPE_LABELS[type] || type}
                                  </span>
                                  <span className="text-gray-400 tabular-nums">
                                    {Math.round(pct)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-black rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 py-8 text-center">
                      Esta cena não contém elementos
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Single scene (no scenes array) ──────────────────────── */}
          {!hasScenes && currentElements.length > 0 && (
            <Card className="border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg text-black">
                  Elementos do Projeto
                </CardTitle>
                <CardDescription>
                  {currentElements.length}{' '}
                  {currentElements.length === 1 ? 'elemento' : 'elementos'} no
                  projeto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(currentTypes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <TypeBadge key={type} type={type} count={count} />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Download ────────────────────────────────────────────── */}
          <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-0">
              <div className="flex-1 space-y-1">
                <p className="font-bold text-black">
                  Baixar dados do projeto
                </p>
                <p className="text-sm text-gray-500">
                  Exporte como JSON para importar no editor ou usar em outras
                  ferramentas
                </p>
              </div>
              <Button
                onClick={handleDownload}
                className="bg-black hover:bg-gray-800 text-white rounded-full px-6 gap-2 flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                Baixar Projeto (.json)
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="relative border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-black">
                marca<span className="text-gray-400">e</span>deixa
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-400">
                Criador de narrativas visuais
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = '/')}
              className="text-sm text-gray-400 hover:text-black rounded-full"
            >
              Criar meu projeto
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
