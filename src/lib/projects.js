import { createClient } from './supabase/client'

// Buscar todos os projetos do usuário logado
export async function getProjects(userId, retryCount = 0) {
  const maxRetries = 3
  const retryDelay = 1000 * Math.pow(2, retryCount) // Exponential backoff
  
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50) // Limitar para melhor performance
    
    if (error) {
      console.error('Erro ao buscar projetos:', error)
      
      // Retry em caso de erro de rede ou timeout
      if (retryCount < maxRetries && (error.code === 'PGRST301' || error.message?.includes('timeout'))) {
        console.log(`Tentativa ${retryCount + 1} de ${maxRetries + 1} em ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return getProjects(userId, retryCount + 1)
      }
      
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Erro inesperado ao buscar projetos:', err)
    
    // Retry em caso de erro de rede
    if (retryCount < maxRetries) {
      console.log(`Tentativa ${retryCount + 1} de ${maxRetries + 1} em ${retryDelay}ms...`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return getProjects(userId, retryCount + 1)
    }
    
    return { data: null, error: err }
  }
}

// Criar um novo projeto
export async function createProject(userId, projectData) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: projectData.name,
        description: projectData.description
      })
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao criar projeto:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Erro inesperado ao criar projeto:', err)
    return { data: null, error: err }
  }
}

// Atualizar um projeto existente
export async function updateProject(projectId, userId, projectData) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: projectData.name,
        description: projectData.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('user_id', userId) // Garantir que só o dono pode editar
      .select()
      .single()
    
    if (error) {
      console.error('Erro ao atualizar projeto:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Erro inesperado ao atualizar projeto:', err)
    return { data: null, error: err }
  }
}

// Deletar um projeto
export async function deleteProject(projectId, userId) {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId) // Garantir que só o dono pode deletar
    
    if (error) {
      console.error('Erro ao deletar projeto:', error)
      return { error }
    }
    
    return { error: null }
  } catch (err) {
    console.error('Erro inesperado ao deletar projeto:', err)
    return { error: err }
  }
}

// Buscar um projeto específico
export async function getProject(projectId, userId) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Erro ao buscar projeto:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Erro inesperado ao buscar projeto:', err)
    return { data: null, error: err }
  }
}