import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ConfirmStatusDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmVariant: 'approve' | 'reject'
  isPending: boolean
  onConfirm: (reason?: string) => void
  onCancel: () => void
}

export function ConfirmStatusDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmStatusDialogProps) {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setValidationError(null)
    }
  }, [open])

  function handleConfirmClick() {
    if (confirmVariant === 'reject') {
      const trimmed = reason.trim()
      if (!trimmed) {
        setValidationError('Por favor, informe a justificativa da reprovação.')
        return
      }
      setValidationError(null)
      onConfirm(trimmed)
    } else {
      onConfirm()
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isPending) onCancel()
      }}
    >
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {confirmVariant === 'reject' && (
          <div className="space-y-2 py-2">
            <Label htmlFor="rejection-reason" className="text-sm font-semibold text-slate-700">
              Justificativa da Reprovação <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Ex: Veículo indisponível no dia solicitado, rota não justificada, etc."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (validationError && e.target.value.trim()) {
                  setValidationError(null)
                }
              }}
              rows={3}
              className={
                validationError
                  ? 'border-red-500 focus-visible:ring-red-400'
                  : 'focus-visible:ring-primary'
              }
              disabled={isPending}
            />
            {validationError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {validationError}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Esta justificativa será registrada no histórico e enviada por email ao solicitante e
              ao motorista.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleConfirmClick}
            disabled={isPending}
            className={
              confirmVariant === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
