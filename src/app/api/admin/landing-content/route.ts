import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Criar cliente Supabase com service role para operações admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar todo o conteúdo da landing page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')

    let query = supabaseAdmin
      .from('landing_page_content')
      .select('*')
      .eq('is_active', true)

    if (section) {
      query = query.eq('section', section)
    }

    const { data, error } = await query.order('section')

    if (error) {
      console.error('Error fetching landing content:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar conteúdo' },
        { status: 500 }
      )
    }

    // Se buscou uma seção específica, retorna o conteúdo diretamente
    if (section && data?.length === 1) {
      return NextResponse.json(data[0])
    }

    // Retorna todo o conteúdo organizado por seção
    const contentBySection: Record<string, any> = {}
    data?.forEach((item) => {
      contentBySection[item.section] = {
        id: item.id,
        content: item.content,
        updated_at: item.updated_at,
      }
    })

    return NextResponse.json(contentBySection)

  } catch (error) {
    console.error('Error in GET landing content:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar conteúdo de uma seção
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { section, content, updated_by } = body

    if (!section || !content) {
      return NextResponse.json(
        { error: 'Section e content são obrigatórios' },
        { status: 400 }
      )
    }

    // Upsert do conteúdo
    const { data, error } = await supabaseAdmin
      .from('landing_page_content')
      .upsert({
        section,
        content,
        updated_by,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'section',
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating landing content:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar conteúdo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Conteúdo atualizado com sucesso',
    })

  } catch (error) {
    console.error('Error in PUT landing content:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova seção (geralmente não usado, mas disponível)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { section, content, updated_by } = body

    if (!section || !content) {
      return NextResponse.json(
        { error: 'Section e content são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('landing_page_content')
      .insert({
        section,
        content,
        updated_by,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating landing content:', error)
      return NextResponse.json(
        { error: 'Erro ao criar conteúdo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Conteúdo criado com sucesso',
    })

  } catch (error) {
    console.error('Error in POST landing content:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

