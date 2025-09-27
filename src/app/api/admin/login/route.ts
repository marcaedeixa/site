import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Cliente Supabase com service role (apenas no servidor)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cliente Supabase normal para auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, recaptchaToken } = await request.json()

    // Verificar reCAPTCHA
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    })

    const recaptchaData = await recaptchaResponse.json()
    if (!recaptchaData.success) {
      return NextResponse.json(
        { error: 'Falha na verificação do reCAPTCHA' },
        { status: 400 }
      )
    }

    // Buscar usuário admin usando service role
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

    // Criar sessão temporária no Supabase Auth
    const tempPassword = `temp_${adminUserData.id}_${Date.now()}`
    
    // Tentar fazer login ou criar usuário no auth
    let authData
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminUserData.email,
      password: tempPassword
    })

    if (signInError) {
      // Se não conseguir fazer login, criar usuário no auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminUserData.email,
        password: tempPassword
      })

      if (signUpError) {
        console.error('Erro ao criar usuário no auth:', signUpError)
        return NextResponse.json(
          { error: 'Erro interno do servidor' },
          { status: 500 }
        )
      }
      authData = signUpData
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