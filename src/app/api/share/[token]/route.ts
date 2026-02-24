import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length < 32) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: share, error: shareError } = await supabase
      .from('project_shares')
      .select('project_id, owner_id, is_active')
      .eq('share_token', token)
      .eq('is_active', true)
      .single()

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Link de compartilhamento não encontrado ou expirado' },
        { status: 404 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', share.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const { data: projectData } = await supabase
      .from('project_data')
      .select('data')
      .eq('project_id', share.project_id)
      .eq('user_id', share.owner_id)
      .single()

    return NextResponse.json({
      project: {
        name: project.name,
        description: project.description,
      },
      data: projectData?.data || null,
    })
  } catch (error) {
    console.error('Erro ao carregar projeto compartilhado:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
