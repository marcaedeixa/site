'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Play, Users, Image, Presentation, Palette, Download, Eye, Check, Crown, Shield, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    {
      icon: <Eye className="w-8 h-8 text-blue-600" />,
      title: "Editor Visual Intuitivo",
      description: "Interface drag-and-drop para criar narrativas visuais sem complicação"
    },
    {
      icon: <Users className="w-8 h-8 text-green-600" />,
      title: "Sistema de Atores",
      description: "Gerencie personagens e elementos com facilidade"
    },
    {
      icon: <Image className="w-8 h-8 text-purple-600" />,
      title: "Criação de Cenas",
      description: "Organize sua narrativa em cenas sequenciais"
    },
    {
      icon: <Presentation className="w-8 h-8 text-red-600" />,
      title: "Slideshow Automático",
      description: "Apresente suas criações com transições suaves"
    },
    {
      icon: <Palette className="w-8 h-8 text-yellow-600" />,
      title: "Palco Personalizável",
      description: "Customize o ambiente visual do seu projeto"
    },
    {
      icon: <Download className="w-8 h-8 text-indigo-600" />,
      title: "Exportação de Projetos",
      description: "Salve e compartilhe suas criações facilmente"
    }
  ]

  const plans = [
    {
      name: 'Plano Gratuito',
      price: 0,
      interval: 'mês',
      description: 'Perfeito para começar',
      features: [
        'Até 3 projetos',
        'Funcionalidades básicas',
        'Suporte por email',
        'Marca d\'água'
      ],
      icon: <Star className="w-8 h-8 text-yellow-600" />,
      buttonText: 'Começar Grátis',
      buttonVariant: 'outline' as const,
      popular: false
    },
    {
      name: 'Plano Básico',
      price: 29.90,
      interval: 'mês',
      description: 'Para usuários regulares',
      features: [
        'Até 10 projetos',
        'Suporte por email',
        'Dashboard básico',
        'Relatórios mensais'
      ],
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      buttonText: 'Assinar Básico',
      buttonVariant: 'default' as const,
      popular: false
    },
    {
      name: 'Plano Premium',
      price: 59.90,
      interval: 'mês',
      description: 'Para profissionais',
      features: [
        'Projetos ilimitados',
        'Suporte prioritário',
        'Dashboard avançado',
        'Relatórios em tempo real',
        'API access',
        'Integrações avançadas'
      ],
      icon: <Crown className="w-8 h-8 text-purple-600" />,
      buttonText: 'Assinar Premium',
      buttonVariant: 'default' as const,
      popular: true
    }
  ]

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const handlePlanClick = (planType: 'free' | 'basic' | 'premium') => {
    if (planType === 'free') {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } else {
      if (user) {
        router.push('/plans')
      } else {
        router.push(`/login?plan=${planType}`)
      }
    }
  }

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
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Marca e Deixa</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => scrollToSection('sobre')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sobre
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('planos')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Planos
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                FAQ
              </button>
            </nav>
            <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700">
              Começar Agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                Crie Narrativas
                <span className="text-blue-600"> Visuais</span>
                <br />Incríveis
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                O editor visual mais intuitivo para criar apresentações, storyboards e narrativas interativas. 
                Transforme suas ideias em experiências visuais envolventes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
                >
                  Criar Projeto Grátis
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-3"
                  onClick={() => scrollToSection('sobre')}
                >
                  Saiba Mais
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
                <div className="bg-gray-700 px-4 py-2 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                  <Play className="w-16 h-16 text-white opacity-80" />
                  <span className="ml-4 text-white text-lg font-medium">Vídeo Demonstrativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre o Produto */}
      <section id="sobre" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Sobre o Marca e Deixa
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Uma plataforma revolucionária que democratiza a criação de conteúdo visual, 
              permitindo que qualquer pessoa crie narrativas profissionais sem conhecimento técnico.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>Simplicidade</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Interface intuitiva que permite criar projetos visuais complexos com apenas alguns cliques
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Colaboração</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Trabalhe em equipe e compartilhe suas criações com facilidade e segurança
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardHeader>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Presentation className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Resultados de qualidade profissional para impressionar sua audiência
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades Poderosas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa para criar narrativas visuais impressionantes, 
              desde a concepção até a apresentação final.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Escolha Seu Plano
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Encontre o plano perfeito para suas necessidades e comece a criar narrativas visuais incríveis hoje mesmo.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative p-6 hover:shadow-xl transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-purple-500 scale-105' : 'hover:scale-105'
              }`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1">
                    Mais Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className="mb-4 flex justify-center">{plan.icon}</div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Grátis' : formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-1">/{plan.interval}</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => handlePlanClick(
                      plan.name === 'Plano Gratuito' ? 'free' : 
                      plan.name === 'Plano Básico' ? 'basic' : 'premium'
                    )}
                    variant={plan.buttonVariant}
                    className={`w-full py-3 text-lg font-semibold ${
                      plan.popular 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : plan.buttonVariant === 'outline' 
                          ? 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {user ? (
                      plan.name === 'Plano Gratuito' ? 'Ir para Dashboard' : 'Fazer Upgrade'
                    ) : (
                      plan.name === 'Plano Gratuito' ? 'Começar Grátis' : `Assinar ${plan.name.replace('Plano ', '')}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas dúvidas sobre o Marca e Deixa
            </p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <button
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {faq.question}
                    </h3>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">Marca e Deixa</h3>
              <p className="text-gray-400 mb-4 max-w-md">
                O editor visual mais intuitivo para criar narrativas e apresentações incríveis. 
                Transforme suas ideias em experiências visuais envolventes.
              </p>
              <Button 
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Começar Agora
              </Button>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Links Úteis</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button 
                    onClick={() => scrollToSection('sobre')}
                    className="hover:text-white transition-colors"
                  >
                    Sobre
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('features')}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('planos')}
                    className="hover:text-white transition-colors"
                  >
                    Planos
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('faq')}
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>contato@marcaedeixa.com</li>
                <li>Suporte técnico</li>
                <li>Documentação</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Marca e Deixa. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
