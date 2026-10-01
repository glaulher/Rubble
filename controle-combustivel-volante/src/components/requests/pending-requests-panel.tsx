import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  ThumbsUp,
  ThumbsDown,
  User,
  Car,
  MapPin,
  Calendar,
  Gauge,
  Image as ImageIcon,
} from 'lucide-react'
import type { FuelRequest, Vehicle, Driver } from '@/stores/use-fuel-store'
import { getPhotoUrl } from '@/services/fuel-requests'

interface PendingRequestsPanelProps {
  pendingRequests: FuelRequest[]
  vehicles: Vehicle[]
  drivers: Driver[]
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
  onViewPhoto: (photoUrl: string) => void
}

export function PendingRequestsPanel({
  pendingRequests,
  vehicles,
  drivers,
  onApprove,
  onReject,
  onViewPhoto,
}: PendingRequestsPanelProps) {
  if (pendingRequests.length === 0) return null

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-white shadow-sm">
      <CardHeader className="pb-3 border-b border-amber-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Painel de Aprovação de Solicitações Pendentes
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                  {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Aprovações ou reprovações efetuadas aqui notificam imediatamente o motorista e o
                solicitante por email.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pendingRequests.map((req) => {
            const vehicle = vehicles.find((v) => v.id === req.vehicle)
            const driver = req.driver ? drivers.find((d) => d.id === req.driver) : null
            const photoUrl = req.photo ? getPhotoUrl({ id: req.id, photo: req.photo }) : null

            return (
              <div
                key={req.id}
                className="bg-white border border-amber-200/80 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Car className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="truncate">{vehicle?.name || 'Veículo não informado'}</span>
                      {vehicle?.plate && (
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {vehicle.plate}
                        </span>
                      )}
                    </div>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => onViewPhoto(photoUrl)}
                        className="text-primary hover:text-primary/80 transition-colors shrink-0"
                        title="Ver foto anexada"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">Motorista:</span>
                      <span className="truncate">{driver?.name || 'Não informado'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">Data:</span>
                      <span>{new Date(req.request_date).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <span className="font-medium text-slate-700">Destino:</span>{' '}
                        <span title={req.destination}>{req.destination}</span>
                      </div>
                    </div>

                    {req.cost_center && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block mt-0.5">
                        Centro de Custo: <strong>{req.cost_center}</strong>
                      </div>
                    )}

                    {req.current_odometer && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Gauge className="h-3 w-3 text-slate-400" />
                        <span>{req.current_odometer.toLocaleString('pt-BR')} km</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1"
                    onClick={() => onReject(req.id)}
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                    Reprovar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    onClick={() => onApprove(req.id)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                    Aprovar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
