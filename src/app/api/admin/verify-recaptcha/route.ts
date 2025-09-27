import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token reCAPTCHA é obrigatório' },
        { status: 400 }
      )
    }
    
    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY não configurada')
      return NextResponse.json(
        { error: 'Configuração do reCAPTCHA não encontrada' },
        { status: 500 }
      )
    }
    
    // Verificar token com Google reCAPTCHA
    const verificationResponse = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: request.ip || 'unknown'
        })
      }
    )
    
    const verificationData = await verificationResponse.json()
    
    if (!verificationData.success) {
      return NextResponse.json(
        { 
          error: 'Falha na verificação do reCAPTCHA',
          details: verificationData['error-codes'] || []
        },
        { status: 400 }
      )
    }
    
    // Verificar score (para reCAPTCHA v3)
    if (verificationData.score && verificationData.score < 0.5) {
      return NextResponse.json(
        { error: 'Score de segurança muito baixo' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      score: verificationData.score || null
    })
    
  } catch (error) {
    console.error('Erro na verificação do reCAPTCHA:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}