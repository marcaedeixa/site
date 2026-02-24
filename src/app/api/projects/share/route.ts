import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const { data: existingShare } = await supabase
      .from('project_shares')
      .select('id, share_token')
      .eq('project_id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (existingShare) {
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${existingShare.share_token}`
      return NextResponse.json({ shareUrl, shareToken: existingShare.share_token, isNew: false })
    }

    const shareToken = randomBytes(32).toString('hex')

    const { data: share, error: shareError } = await supabase
      .from('project_shares')
      .insert({
        project_id: projectId,
        owner_id: user.id,
        share_token: shareToken,
        is_active: true,
      })
      .select()
      .single()

    if (shareError) {
      console.error('Erro ao criar compartilhamento:', shareError)
      return NextResponse.json({ error: 'Erro ao criar link de compartilhamento' }, { status: 500 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareToken}`
    return NextResponse.json({ shareUrl, shareToken, isNew: true })
  } catch (error) {
    console.error('Erro no compartilhamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 })
    }

    const { data: share } = await supabase
      .from('project_shares')
      .select('id, share_token, is_active, created_at')
      .eq('project_id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (!share) {
      return NextResponse.json({ shared: false })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${share.share_token}`
    return NextResponse.json({
      shared: true,
      shareUrl,
      shareToken: share.share_token,
      isActive: share.is_active,
      createdAt: share.created_at,
    })
  } catch (error) {
    console.error('Erro ao verificar compartilhamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('project_shares')
      .delete()
      .eq('project_id', projectId)
      .eq('owner_id', user.id)

    if (deleteError) {
      console.error('Erro ao remover compartilhamento:', deleteError)
      return NextResponse.json({ error: 'Erro ao remover compartilhamento' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover compartilhamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
