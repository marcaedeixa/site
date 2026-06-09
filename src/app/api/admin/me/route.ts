import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Obter sessão do usuário via cookie (cliente normal, sem service role)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar dados do admin pelo email usando service role (bypassa RLS)
    const supabaseAdmin = await createClient(true)
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, name, role, is_active, last_login')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Usuário admin não encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro em /api/admin/me:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
