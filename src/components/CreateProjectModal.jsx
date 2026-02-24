'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { createProject } from '@/lib/projects'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export function CreateProjectModal({ open, onOpenChange, onProjectCreated, currentProjectCount, maxProjects }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Nome do projeto é obrigatório')
      return
    }

    if (!user?.id) {
      setError('Usuário não autenticado')
      return
    }

    setLoading(true)
    setError('')

    // Check project limit
    if (maxProjects !== undefined && currentProjectCount !== undefined && currentProjectCount >= maxProjects) {
      setError(`Limite máximo de ${maxProjects} projetos atingido. Faça upgrade para criar mais projetos.`)
      setLoading(false)
      return
    }

    // Check for duplicate project name
    try {
      const supabase = createClient()
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', formData.name.trim())
        .maybeSingle()

      if (existingProject) {
        setError('Já existe um projeto com este nome. Escolha um nome diferente.')
        setLoading(false)
        return
      }
    } catch (err) {
      console.error('Erro ao verificar nome do projeto:', err)
      setError('Erro ao verificar nome do projeto')
      setLoading(false)
      return
    }
    setError('')

    try {
      const { data, error: createError } = await createProject(user.id, {
        name: formData.name.trim(),
        description: formData.description.trim()
      })

      if (createError) {
        setError('Erro ao criar projeto: ' + createError.message)
        return
      }

      // Resetar formulário
      setFormData({ name: '', description: '' })
      
      // Fechar modal
      onOpenChange(false)
      
      // Notificar componente pai sobre o novo projeto
      if (onProjectCreated) {
        onProjectCreated(data)
      }
    } catch (err) {
      setError('Erro inesperado ao criar projeto')
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', description: '' })
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
          <DialogDescription>
            Preencha as informações básicas do seu novo projeto.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input
              id="name"
              placeholder="Digite o nome do projeto"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={loading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva brevemente o projeto (opcional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={loading}
              rows={3}
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Projeto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}