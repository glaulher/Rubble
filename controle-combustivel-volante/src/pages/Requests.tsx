import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import useFuelStore, { type FuelRequest } from '@/stores/use-fuel-store'
import { useAuth } from '@/hooks/use-auth'
import { RequestFormDialog } from '@/components/requests/request-form-dialog'
import { EditRequestDialog } from '@/components/requests/edit-request-dialog'
import { PhotoLightbox } from '@/components/requests/photo-lightbox'
import { ConfirmStatusDialog } from '@/components/requests/confirm-status-dialog'
import { DeleteRequestDialog } from '@/components/requests/delete-request-dialog'
import { PendingRequestsPanel } from '@/components/requests/pending-requests-panel'
import { getPhotoUrl } from '@/services/fuel-requests'

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Aberto: 'bg-amber-100 text-amber-800 border-amber-200',
    'Em Andamento': 'bg-blue-100 text-blue-800 border-blue-200',
    Concluído: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Reprovado: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <Badge variant="secondary" className={map[status] || ''}>
      {status}
    </Badge>
  )
}

export default function Requests() {
  const {
    fuelRequests,
    vehicles,
    drivers,
    loading,
    error,
    updateFuelRequestStatus,
    approveFuelRequest,
    rejectFuelRequest,
  } = useFuelStore()
  const { isAdmin } = useAuth()
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<FuelRequest | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<FuelRequest | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    requestId: string
  } | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleConfirm(rejectionReason?: string) {
    if (!confirmAction) return
    setIsPending(true)
    const { type, requestId } = confirmAction
    const result =
      type === 'approve'
        ? await approveFuelRequest(requestId)
        : await rejectFuelRequest(requestId, rejectionReason || '')
    setIsPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        type === 'approve'
          ? 'Solicitação aprovada com sucesso'
          : 'Solicitação reprovada com sucesso',
      )
    }
    setConfirmAction(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Carregando solicitações...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium">
          Erro ao carregar solicitações. Tente novamente.
        </p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Solicitações de Combustível
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie e acompanhe requisições de abastecimento da frota.
          </p>
        </div>
        <RequestFormDialog />
      </div>

      {isAdmin && (
        <PendingRequestsPanel
          pendingRequests={fuelRequests.filter((req) => req.status === 'Aberto')}
          vehicles={vehicles}
          drivers={drivers}
          onApprove={(requestId) => setConfirmAction({ type: 'approve', requestId })}
          onReject={(requestId) => setConfirmAction({ type: 'reject', requestId })}
          onViewPhoto={(url) => setLightboxUrl(url)}
        />
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Odômetro</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      Nenhuma solicitação de combustível encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelRequests.map((req) => {
                    const vehicle = vehicles.find((v) => v.id === req.vehicle)
                    return (
                      <TableRow
                        key={req.id}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="font-medium text-slate-700">
                          {new Date(req.request_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {req.driver
                            ? (drivers.find((d) => d.id === req.driver)?.name ?? '—')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{vehicle?.name ?? '—'}</div>
                          <div className="text-xs text-slate-500">{vehicle?.plate}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={req.destination}>
                          {req.destination}
                        </TableCell>
                        <TableCell>{req.cost_center || '—'}</TableCell>
                        <TableCell>
                          {req.current_odometer ? (
                            <div>
                              <div className="font-medium text-slate-700">
                                {req.current_odometer.toLocaleString('pt-BR')} km
                              </div>
                              {req.last_refuel_odometer ? (
                                <div className="text-xs text-slate-500">
                                  Últ: {req.last_refuel_odometer.toLocaleString('pt-BR')} km
                                  {req.last_refuel_date
                                    ? ` (${new Date(req.last_refuel_date).toLocaleDateString('pt-BR')})`
                                    : ''}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {req.photo ? (
                            <img
                              src={getPhotoUrl({ id: req.id, photo: req.photo }) || ''}
                              alt="Foto"
                              className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                setLightboxUrl(getPhotoUrl({ id: req.id, photo: req.photo }))
                              }
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(req.status)}
                            {req.status === 'Reprovado' && req.rejection_reason && (
                              <div
                                className="text-xs text-red-600 max-w-[220px] bg-red-50/80 border border-red-100 rounded px-2 py-1"
                                title={req.rejection_reason}
                              >
                                <span className="font-semibold">Motivo:</span>{' '}
                                {req.rejection_reason}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-slate-100"
                              onClick={() => setEditingRequest(req)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeletingRequest(req)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {isAdmin && req.status === 'Aberto' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                  onClick={() =>
                                    setConfirmAction({ type: 'approve', requestId: req.id })
                                  }
                                  title="Aprovar"
                                >
                                  <ThumbsUp className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  onClick={() =>
                                    setConfirmAction({ type: 'reject', requestId: req.id })
                                  }
                                  title="Reprovar"
                                >
                                  <ThumbsDown className="h-4 w-4 mr-1" />
                                  Reprovar
                                </Button>
                              </>
                            )}
                            {req.status === 'Aberto' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                  onClick={() => updateFuelRequestStatus(req.id, 'Em Andamento')}
                                  title="Iniciar"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Iniciar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                  onClick={() => updateFuelRequestStatus(req.id, 'Concluído')}
                                  title="Concluir"
                                >
                                  <CheckCheck className="h-4 w-4 mr-1" />
                                  Concluir
                                </Button>
                              </>
                            )}
                            {req.status === 'Em Andamento' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => updateFuelRequestStatus(req.id, 'Concluído')}
                                title="Concluir"
                              >
                                <CheckCheck className="h-4 w-4 mr-1" />
                                Concluir
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PhotoLightbox photoUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <DeleteRequestDialog request={deletingRequest} onClose={() => setDeletingRequest(null)} />
      <EditRequestDialog request={editingRequest} onClose={() => setEditingRequest(null)} />
      <ConfirmStatusDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'approve' ? 'Aprovar Solicitação' : 'Reprovar Solicitação'}
        description={
          confirmAction?.type === 'approve'
            ? 'Tem certeza que deseja aprovar esta solicitação de combustível? O motorista e o solicitante serão notificados por email.'
            : 'Ao reprovar esta solicitação, você deve informar uma justificativa obrigatória. O solicitante e o motorista serão notificados por email.'
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Sim, Aprovar' : 'Sim, Reprovar'}
        confirmVariant={confirmAction?.type || 'approve'}
        isPending={isPending}
        onConfirm={(reason) => handleConfirm(reason)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
