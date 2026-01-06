'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Users, 
  Layers, 
  Presentation, 
  Sparkles, 
  Download, 
  Eye,
  ArrowRight,
  Menu,
  X
} from 'lucide-react'
import PricingSection from '@/components/stripe/PricingSection'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    {
      icon: Eye,
      title: "Editor Visual",
      description: "Interface drag-and-drop intuitiva para criar narrativas visuais sem complicação"
    },
    {
      icon: Users,
      title: "Sistema de Atores",
      description: "Gerencie personagens e elementos com facilidade e precisão"
    },
    {
      icon: Layers,
      title: "Criação de Cenas",
      description: "Organize sua narrativa em cenas sequenciais e dinâmicas"
    },
    {
      icon: Presentation,
      title: "Apresentação",
      description: "Apresente suas criações com transições suaves e profissionais"
    },
    {
      icon: Sparkles,
      title: "Personalização",
      description: "Customize cada detalhe do ambiente visual do seu projeto"
    },
    {
      icon: Download,
      title: "Exportação",
      description: "Salve e compartilhe suas criações em diversos formatos"
    }
  ]

  const faqs = [
    {
      question: "O que é o Marca e Deixa?",
      answer: "É um editor visual intuitivo para criação de narrativas e apresentações interativas, permitindo que você organize elementos, atores e cenas de forma visual."
    },
    {
      question: "Preciso de conhecimento técnico para usar?",
      answer: "Não! O Marca e Deixa foi desenvolvido para ser intuitivo. Com interface drag-and-drop, qualquer pessoa pode criar projetos visuais profissionais."
    },
    {
      question: "Posso colaborar com outras pessoas?",
      answer: "Sim! Você pode compartilhar seus projetos e trabalhar em equipe na criação de narrativas visuais."
    },
    {
      question: "Que tipos de projetos posso criar?",
      answer: "Apresentações, narrativas interativas, storyboards, protótipos visuais e muito mais. As possibilidades são limitadas apenas pela sua criatividade."
    },
    {
      question: "Como funciona o sistema de cenas?",
      answer: "Você pode criar múltiplas cenas, cada uma com seus próprios elementos e atores. O sistema permite navegação sequencial e apresentação automática."
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl font-black tracking-tight text-black">
                marca<span className="text-gray-400">e</span>deixa
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-12">
              <button 
                onClick={() => scrollToSection('sobre')}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Sobre
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Recursos
              </button>
              <button 
                onClick={() => scrollToSection('planos')}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                Planos
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                FAQ
              </button>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button 
                onClick={handleGetStarted} 
                className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-full font-medium"
              >
                Começar Agora
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <nav className="flex flex-col space-y-4 px-4">
              <button onClick={() => scrollToSection('sobre')} className="text-left py-2 text-gray-600">Sobre</button>
              <button onClick={() => scrollToSection('features')} className="text-left py-2 text-gray-600">Recursos</button>
              <button onClick={() => scrollToSection('planos')} className="text-left py-2 text-gray-600">Planos</button>
              <button onClick={() => scrollToSection('faq')} className="text-left py-2 text-gray-600">FAQ</button>
              <Button onClick={handleGetStarted} className="bg-black text-white rounded-full mt-2">
                Começar Agora
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                <span className="text-sm font-medium text-gray-600">Novo: Editor v2.0 disponível</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-black leading-[1.1] tracking-tight">
                Crie histórias
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600">
                  visuais
                </span>
                <br />
                incríveis
              </h1>
              
              <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
                O editor mais intuitivo para criar apresentações, storyboards e narrativas interativas. 
                Dê vida às suas ideias.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-black hover:bg-gray-800 text-white text-lg px-8 py-6 rounded-full font-medium group"
                >
                  Começar Grátis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="ghost"
                  size="lg"
                  className="text-lg px-8 py-6 rounded-full font-medium text-gray-600 hover:text-black hover:bg-gray-100"
                  onClick={() => scrollToSection('sobre')}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Ver Demo
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">+1.000 criadores</p>
                  <p className="text-sm text-gray-500">já estão usando</p>
                </div>
              </div>
            </div>

            {/* Visual Element */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Main Card */}
                <div className="bg-black rounded-3xl shadow-2xl overflow-hidden">
                  <div className="bg-gray-900 px-6 py-4 flex items-center gap-2">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                    <span className="ml-4 text-gray-500 text-sm font-mono">editor.marcaedeixa.com</span>
                  </div>
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 p-8">
                    <div className="h-full border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Play className="w-10 h-10 text-white" />
                        </div>
                        <p className="text-gray-400 font-medium">Seu projeto aqui</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">Salvo!</p>
                      <p className="text-xs text-gray-500">Há 2 segundos</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">12 cenas</p>
                      <p className="text-xs text-gray-500">criadas hoje</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block">
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
            <div className="w-1.5 h-3 bg-gray-300 rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-32 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Sobre nós</span>
              <h2 className="text-4xl md:text-5xl font-black mt-4 mb-6 leading-tight">
                Democratizamos a criação de conteúdo visual
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed mb-8">
                Uma plataforma revolucionária que permite que qualquer pessoa crie 
                narrativas profissionais sem conhecimento técnico.
              </p>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-4xl font-black text-white">XX+</p>
                  <p className="text-sm text-gray-500 mt-1">Usuários ativos</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-white">XXk+</p>
                  <p className="text-sm text-gray-500 mt-1">Projetos criados</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-white">XX%</p>
                  <p className="text-sm text-gray-500 mt-1">Satisfação</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <Eye className="w-8 h-8 text-white mb-4" />
                  <h3 className="text-lg font-bold mb-2">Simplicidade</h3>
                  <p className="text-gray-400 text-sm">Interface intuitiva para criar projetos complexos</p>
                </div>
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <Presentation className="w-8 h-8 text-white mb-4" />
                  <h3 className="text-lg font-bold mb-2">Profissional</h3>
                  <p className="text-gray-400 text-sm">Resultados de qualidade para sua audiência</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <Users className="w-8 h-8 text-white mb-4" />
                  <h3 className="text-lg font-bold mb-2">Colaboração</h3>
                  <p className="text-gray-400 text-sm">Trabalhe em equipe com facilidade</p>
                </div>
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <Sparkles className="w-8 h-8 text-white mb-4" />
                  <h3 className="text-lg font-bold mb-2">Inovação</h3>
                  <p className="text-gray-400 text-sm">Recursos avançados sempre atualizados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recursos</span>
            <h2 className="text-4xl md:text-5xl font-black text-black mt-4 mb-6">
              Tudo que você precisa
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Ferramentas poderosas para criar narrativas visuais impressionantes
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div 
                  key={index} 
                  className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-black hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-black group-hover:text-white transition-colors">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="bg-white">
        <PricingSection 
          userId={user?.id}
          userEmail={user?.email}
          showTrialOption={true}
          className="bg-white"
        />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-black text-black mt-4 mb-6">
              Perguntas Frequentes
            </h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <button
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <h3 className="text-lg font-semibold text-black pr-4">
                    {faq.question}
                  </h3>
                  <div className={`w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-500 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Junte-se a milhares de criadores que já estão transformando suas ideias em realidade.
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="bg-white hover:bg-gray-100 text-black text-lg px-10 py-6 rounded-full font-medium group"
          >
            Começar Agora — É Grátis
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <span className="text-2xl font-black tracking-tight">
                marca<span className="text-gray-600">e</span>deixa
              </span>
              <p className="text-gray-400 mt-4 max-w-md leading-relaxed">
                O editor visual mais intuitivo para criar narrativas e apresentações incríveis. 
                Transforme suas ideias em experiências visuais envolventes.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Navegação</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => scrollToSection('sobre')} className="text-gray-400 hover:text-white transition-colors">
                    Sobre
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-white transition-colors">
                    Recursos
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('planos')} className="text-gray-400 hover:text-white transition-colors">
                    Planos
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('faq')} className="text-gray-400 hover:text-white transition-colors">
                    FAQ
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Contato</h4>
              <ul className="space-y-3 text-gray-400">
                <li>contato@marcaedeixa.com</li>
                <li>Suporte técnico</li>
                <li>Documentação</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; 2024 Marca e Deixa. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Termos</a>
              <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
