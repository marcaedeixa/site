import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

// Função para criar cliente Supabase com service role
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Função para criar cliente Supabase normal
async function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing')
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Buscar usuário admin usando service role
    const supabaseAdmin = getSupabaseAdmin()
    const { data: adminUserData, error: fetchError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, password_hash, name, role, is_active, login_attempts, locked_until')
      .eq('email', email)
      .single()

    if (fetchError || !adminUserData) {
      // Log da tentativa falhada
      await logFailedAttempt(email, 'USER_NOT_FOUND')
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar se a conta está bloqueada
    if (adminUserData.locked_until && new Date(adminUserData.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.' },
        { status: 423 }
      )
    }

    if (!adminUserData.is_active) {
      return NextResponse.json(
        { error: 'Conta desativada' },
        { status: 403 }
      )
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, adminUserData.password_hash)

    if (!passwordMatch) {
      await incrementFailedAttempts(adminUserData.id)
      await logFailedAttempt(email, 'INVALID_PASSWORD')
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Reset tentativas de login e atualizar último login
    await supabaseAdmin
      .from('admin_users')
      .update({
        login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      })
      .eq('id', adminUserData.id)

    const tempPassword = `Adm!${adminUserData.id.replace(/-/g, '').slice(0, 12)}#Session2026`

    // Tentar fazer login primeiro (caso o usuário já exista no auth)
    const supabase = await getSupabase()
    let authData
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminUserData.email,
      password: tempPassword
    })

    if (signInError) {
      const { data: userListData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200
      })

      if (listUsersError) {
        console.error('Erro ao listar usuários do auth:', listUsersError)
        return NextResponse.json(
          { error: 'Erro interno do servidor' },
          { status: 500 }
        )
      }

      const existingAuthUser = userListData.users.find(
        (user) => user.email?.toLowerCase() === adminUserData.email.toLowerCase()
      )

      if (existingAuthUser) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          existingAuthUser.id,
          {
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              admin_id: adminUserData.id,
              role: adminUserData.role,
              name: adminUserData.name
            }
          }
        )

        if (updateAuthError) {
          console.error('Erro ao atualizar usuário admin no auth:', updateAuthError)
          return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
          )
        }
      } else {
        const { error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: adminUserData.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            admin_id: adminUserData.id,
            role: adminUserData.role,
            name: adminUserData.name
          }
        })

        if (createAuthError) {
          console.error('Erro ao criar usuário admin no auth:', createAuthError)
          return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
          )
        }
      }

      const { data: retrySignInData, error: retrySignInError } = await supabase.auth.signInWithPassword({
        email: adminUserData.email,
        password: tempPassword
      })

      if (retrySignInError) {
        console.error('Erro ao autenticar admin no auth:', retrySignInError)
        return NextResponse.json(
          { error: 'Erro interno do servidor' },
          { status: 500 }
        )
      }

      authData = retrySignInData
    } else {
      authData = signInData
    }

    const adminUser = {
      id: adminUserData.id,
      email: adminUserData.email,
      name: adminUserData.name,
      role: adminUserData.role,
      is_active: adminUserData.is_active,
      last_login: new Date().toISOString()
    }

    await logSuccessfulLogin(adminUserData.id)

    return NextResponse.json({
      user: adminUser,
      session: authData.session
    })

  } catch (error) {
    console.error('Erro no login admin:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Funções auxiliares
async function logFailedAttempt(email: string, reason: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        email,
        action: 'LOGIN_FAILED',
        details: { reason },
        ip_address: 'unknown',
        user_agent: 'unknown'
      })
  } catch (error) {
    console.error('Erro ao registrar tentativa falhada:', error)
  }
}

async function incrementFailedAttempts(adminUserId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: userData } = await supabaseAdmin
      .from('admin_users')
      .select('login_attempts')
      .eq('id', adminUserId)
      .single()

    if (userData) {
      const newAttempts = (userData.login_attempts || 0) + 1
      const updates: any = { login_attempts: newAttempts }

      // Bloquear conta após 5 tentativas
      if (newAttempts >= 5) {
        const lockUntil = new Date()
        lockUntil.setMinutes(lockUntil.getMinutes() + 30) // 30 minutos
        updates.locked_until = lockUntil.toISOString()
      }

      await supabaseAdmin
        .from('admin_users')
        .update(updates)
        .eq('id', adminUserId)
    }
  } catch (error) {
    console.error('Erro ao incrementar tentativas:', error)
  }
}

async function logSuccessfulLogin(adminUserId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        admin_user_id: adminUserId,
        action: 'LOGIN_SUCCESS',
        ip_address: 'unknown',
        user_agent: 'unknown'
      })
  } catch (error) {
    console.error('Erro ao registrar login bem-sucedido:', error)
  }
}
