import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
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

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const supabaseAdmin = await createClient(true)
    const { data: adminUser, error: fetchError } = await supabaseAdmin
      .from('admin_users')
      .select('id, password_hash')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (fetchError || !adminUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const passwordMatch = await bcrypt.compare(currentPassword, adminUser.password_hash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    const { error: updateError } = await supabaseAdmin
      .from('admin_users')
      .update({ password_hash: newPasswordHash })
      .eq('id', adminUser.id)

    if (updateError) throw updateError

    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        admin_user_id: adminUser.id,
        action: 'PASSWORD_CHANGE',
        ip_address: 'unknown',
        user_agent: 'unknown',
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao trocar senha admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
