import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function PhotoLightbox({
  photoUrl,
  onClose,
}: {
  photoUrl: string | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!photoUrl} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Foto da Solicitação</DialogTitle>
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Foto da solicitação"
            className="w-full h-auto object-contain max-h-[80vh]"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
