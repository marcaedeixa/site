'use client'

import { useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Database,
  LogOut,
  RefreshCw,
  CreditCard,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  description?: string
  currentPath: string
  onRefresh?: () => void
  refreshing?: boolean
  actions?: ReactNode
}

export default function AdminLayout({ 
  children, 
  title, 
  description, 
  currentPath, 
  onRefresh, 
  refreshing = false,
  actions 
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { adminUser, signOut } = useAdminAuth()

  const handleLogout = async () => {
    await signOut()
    router.push('/admin/login')
  }

  // Sidebar de navegação
  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', href: '/admin', active: currentPath === '/admin' },
    { icon: Users, label: 'Clientes', href: '/admin/customers', active: currentPath === '/admin/customers' },
    { icon: CreditCard, label: 'Stripe', href: '/admin/stripe', active: currentPath === '/admin/stripe' },
    { icon: CreditCard, label: 'Assinaturas', href: '/admin/subscriptions', active: currentPath === '/admin/subscriptions' },
    { icon: Database, label: 'Supabase', href: '/admin/settings/supabase', active: currentPath === '/admin/settings/supabase' },
    { icon: Settings, label: 'Configurações', href: '/admin/settings', active: currentPath === '/admin/settings' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    item.active && "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  )}
                  onClick={() => {
                    router.push(item.href)
                    setSidebarOpen(false)
                  }}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              )
            })}
          </div>
          
          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:bg-gray-100"
              onClick={() => {
                router.push('/admin/logs')
                setSidebarOpen(false)
              }}
            >
              <Shield className="mr-3 h-5 w-5" />
              Logs de Segurança
            </Button>
          </div>
          
          <Separator className="my-6" />
          
          {adminUser && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </p>
              <div className="mt-2 flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-600">
                      {adminUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
                  <p className="text-xs text-gray-500">{adminUser.role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          )}
        </nav>
      </div>
      
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden mr-3"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {description && (
                    <p className="text-gray-600">{description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {onRefresh && (
                  <Button
                    onClick={onRefresh}
                    disabled={refreshing}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    Atualizar
                  </Button>
                )}
                {actions}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}