import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkStripeSubscription } from '@/middleware/stripeSubscription'

// Rotas que requerem autenticação administrativa
const adminRoutes = ['/admin']
// Rotas públicas do admin (login)
const adminPublicRoutes = ['/admin/login']

// Rotas que requerem verificação de assinatura
const subscriptionRoutes = ['/dashboard']
// Rotas públicas (não requerem assinatura)
const publicRoutes = ['/', '/login', '/register', '/plans', '/pricing']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar se é uma rota administrativa
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isAdminPublicRoute = adminPublicRoutes.some(route => pathname.startsWith(route))
  
  // Verificar se é uma rota que requer assinatura
  const isSubscriptionRoute = subscriptionRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  
  if (isAdminRoute && !isAdminPublicRoute) {
    try {
      const supabase = createClient()
      
      // Verificar se há sessão ativa
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        // Redirecionar para login admin se não autenticado
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      // Verificar se o usuário é admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active')
        .eq('id', session.user.id)
        .eq('is_active', true)
        .single()
      
      if (adminError || !adminUser) {
        // Usuário não é admin ou não está ativo
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(loginUrl)
      }
      
      // Log de acesso administrativo
      await logAdminAccess(supabase, adminUser.id, pathname, request)
      
      // Adicionar headers com informações do admin
      const response = NextResponse.next()
      response.headers.set('x-admin-user-id', adminUser.id)
      response.headers.set('x-admin-role', adminUser.role)
      
      return response
      
    } catch (error) {
      console.error('Erro no middleware admin:', error)
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('error', 'system_error')
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Se é rota de login admin e já está autenticado, redirecionar para dashboard
  if (pathname === '/admin/login') {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', session.user.id)
          .eq('is_active', true)
          .single()
        
        if (adminUser) {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
      }
    } catch (error) {
      // Continuar para a página de login em caso de erro
    }
  }
  
  // Verificar assinatura para rotas protegidas (não admin e não públicas)
  if (isSubscriptionRoute && !isAdminRoute && !isPublicRoute) {
    const response = NextResponse.next()
    return await checkStripeSubscription(request, response)
  }
  
  return NextResponse.next()
}

// Função para registrar acesso administrativo
async function logAdminAccess(
  supabase: any,
  adminUserId: string,
  pathname: string,
  request: NextRequest
) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || request.ip || 'unknown'
    
    await supabase
      .from('admin_access_logs')
      .insert({
        admin_user_id: adminUserId,
        action: `ACCESS_${pathname.toUpperCase().replace(/\//g, '_')}`,
        ip_address: ip,
        user_agent: userAgent,
        success: true,
        details: {
          method: request.method,
          pathname,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Erro ao registrar log de acesso:', error)
  }
}

// Configuração do matcher para otimizar performance
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}