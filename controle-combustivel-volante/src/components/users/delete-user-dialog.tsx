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
import { deleteUser, type UserRecord } from '@/services/users'
import { toast } from 'sonner'

export function DeleteUserDialog({
  user,
  onClose,
}: {
  user: UserRecord | null
  onClose: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!user) return
    setIsDeleting(true)
    try {
      await deleteUser(user.id)
      toast.success('Usuário excluído com sucesso')
      onClose()
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string }
      const msg = errorObj?.data?.message || errorObj?.message || 'Erro ao excluir usuário'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={!!user}
      onOpenChange={(v) => {
        if (!v && !isDeleting) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Excluir Usuário
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o usuário <strong>{user?.name || user?.email}</strong>?
            Esta ação não pode ser desfeita. Registros relacionados (veículos, solicitações,
            abastecimentos) podem ficar órfãos.
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
