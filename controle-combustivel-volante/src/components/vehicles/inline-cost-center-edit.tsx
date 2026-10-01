import { useState, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import useFuelStore from '@/stores/use-fuel-store'

export function InlineCostCenterEdit({ vehicleId, value }: { vehicleId: string; value: string }) {
  const { editVehicle } = useFuelStore()
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function handleStartEdit() {
    setInputValue(value)
    setIsEditing(true)
  }

  async function handleSave() {
    if (inputValue === value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    const result = await editVehicle(vehicleId, { cost_center: inputValue })
    setIsSaving(false)
    if (result.error) {
      setInputValue(value)
      toast.error('Erro ao atualizar centro de custo.')
    } else {
      toast.success('Centro de custo atualizado.')
    }
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setInputValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="w-28 text-sm px-2 py-0.5 rounded border border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          placeholder="—"
        />
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>
    )
  }

  return (
    <span
      className="font-medium text-slate-700 cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition-colors"
      onClick={handleStartEdit}
      title="Clique para editar"
    >
      {value || '—'}
    </span>
  )
}
