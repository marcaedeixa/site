'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Element } from '@/hooks/useEditorStore'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth.tsx'
import { useParams } from 'next/navigation'

interface ActorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (actorData: Partial<Element>) => void
  position: { x: number; y: number }
  initialData?: Partial<Element>
  currentActorCount: number
}

const ACTOR_COLORS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#F97316', label: 'Laranja' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6B7280', label: 'Cinza' },
]

export function ActorModal({ isOpen, onClose, onSave, position, initialData, currentActorCount }: ActorModalProps) {
  const { user } = useAuth()
  const params = useParams()
  const projectId = params.projectId as string
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    actorName: initialData?.actorName || '',
    actorInitials: initialData?.actorInitials || '',
    strokeColor: initialData?.strokeColor || '#3B82F6',
    fillColor: initialData?.fillColor || '#E0F2FE'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const generateInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.actorName.trim()) {
      newErrors.actorName = 'Nome é obrigatório'
    }

    if (formData.actorName.trim().length < 2) {
      newErrors.actorName = 'Nome deve ter pelo menos 2 caracteres'
    }

    if (!formData.actorInitials.trim()) {
      newErrors.actorInitials = 'Iniciais são obrigatórias'
    } else if (formData.actorInitials.length > 3) {
      newErrors.actorInitials = 'Máximo 3 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !user || !projectId) return

    // Check actor limit
    if (currentActorCount >= 30) {
      setErrors({ actorName: 'Limite máximo de 30 atores por projeto atingido' })
      return
    }

    try {
      setSaving(true)
      
      // Primeiro salvar no banco de dados
      const actorDbData = {
        project_id: projectId,
        user_id: user.id,
        name: formData.actorName.trim(),
        color: formData.strokeColor,
        notes: null,
        appearance_config: {
          shape: 'circle',
          size: 50
        },
        default_speech_bubble: {
          style: 'rounded',
          color: formData.fillColor,
          textColor: formData.strokeColor
        }
      }
      
      const { data: insertedData, error: dbError } = await supabase
        .from('actors')
        .insert(actorDbData as any)
        .select()
      
      if (dbError) {
        console.error('Erro ao salvar ator no banco:', dbError)
        setErrors({ actorName: 'Erro ao salvar ator. Tente novamente.' })
        return
      }
      
      // Disparar evento para atualizar lista de atores
      window.dispatchEvent(new CustomEvent('actorCreated', { detail: insertedData[0] }))
      
      // Depois criar elemento no canvas
      const actorData: Partial<Element> = {
        type: 'actor',
        x: position.x - 25,
        y: position.y - 25,
        width: 50,
        height: 50,
        actorName: formData.actorName.trim(),
        actorShape: 'circle',
        actorInitials: formData.actorInitials.trim(),
        strokeColor: formData.strokeColor,
        fillColor: formData.fillColor,
        strokeWidth: 2,
        opacity: 1
      }

      onSave(actorData)
      onClose()
      
      // Reset form
      setFormData({
        actorName: '',
        actorInitials: '',
        strokeColor: '#3B82F6',
        fillColor: '#E0F2FE'
      })
      setErrors({})
    } catch (error) {
      console.error('Erro ao criar ator:', error)
      setErrors({ actorName: 'Erro inesperado. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onClose()
    setErrors({})
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-generate initials when name changes, but only if initials are empty or auto-generated
      if (field === 'actorName' && value.trim()) {
        const currentInitials = prev.actorInitials
        const autoGeneratedInitials = generateInitials(prev.actorName)
        
        // Only update initials if they're empty or match the auto-generated ones
        if (!currentInitials || currentInitials === autoGeneratedInitials) {
          newData.actorInitials = generateInitials(value.trim())
        }
      }
      
      return newData
    })
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Ator</DialogTitle>
          <p className="text-sm text-gray-600">
            Atores: {currentActorCount}/30
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="actorName">Nome *</Label>
            <Input
              id="actorName"
              placeholder="Digite o nome do ator"
              value={formData.actorName}
              onChange={(e) => handleInputChange('actorName', e.target.value)}
              className={errors.actorName ? 'border-red-500' : ''}
            />
            {errors.actorName && (
              <p className="text-sm text-red-500">{errors.actorName}</p>
            )}
          </div>

          {/* Iniciais */}
          <div className="space-y-2">
            <Label htmlFor="actorInitials">Iniciais/Sigla *</Label>
            <Input
              id="actorInitials"
              placeholder="Ex: AB"
              maxLength={3}
              value={formData.actorInitials}
              onChange={(e) => handleInputChange('actorInitials', e.target.value.toUpperCase())}
              className={errors.actorInitials ? 'border-red-500' : ''}
            />
            {errors.actorInitials && (
              <p className="text-sm text-red-500">{errors.actorInitials}</p>
            )}
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {ACTOR_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.strokeColor === color.value
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => {
                    handleInputChange('strokeColor', color.value)
                    // Set a lighter fill color based on stroke color
                    const fillColor = color.value + '20' // Add transparency
                    handleInputChange('fillColor', fillColor)
                  }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.actorName && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div
                  className={`w-12 h-12 border-2 flex items-center justify-center text-sm font-bold ${
                    formData.actorShape === 'circle' ? 'rounded-full' : 'rounded-md'
                  }`}
                  style={{
                    borderColor: formData.strokeColor,
                    backgroundColor: formData.fillColor,
                    color: formData.strokeColor
                  }}
                >
                  {formData.actorInitials}
                </div>
                <div>
                  <p className="font-medium">{formData.actorName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.actorName.trim() || saving}>
            {saving ? 'Criando...' : 'Criar Ator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}