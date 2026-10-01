import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
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
import useFuelStore, { type FuelRequest } from '@/stores/use-fuel-store'
import { toast } from 'sonner'

export function DeleteRequestDialog({
  request,
  onClose,
}: {
  request: FuelRequest | null
  onClose: () => void
}) {
  const { removeFuelRequest } = useFuelStore()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!request) return
    setIsDeleting(true)
    const result = await removeFuelRequest(request.id)
    setIsDeleting(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Solicitação excluída com sucesso')
    }
    onClose()
  }

  return (
    <AlertDialog
      open={!!request}
      onOpenChange={(v) => {
        if (!v && !isDeleting) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Excluir Solicitação
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
