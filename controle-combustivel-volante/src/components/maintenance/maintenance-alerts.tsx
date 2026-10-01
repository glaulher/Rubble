import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, AlertTriangle, Plus, Info, User } from 'lucide-react'
import useFuelStore, { type MaintenanceInterval } from '@/stores/use-fuel-store'
import { MaintenanceFormDialog } from '@/components/maintenance/maintenance-form-dialog'

type AlertItem = {
  vehicleId: string
  vehicleName: string
  vehiclePlate: string
  driverName: string | null
  interval: MaintenanceInterval
  currentKm: number
  threshold: number
  isOverdue: boolean
  isApproaching: boolean
  kmDiff: number
}

type NoDataItem = {
  vehicleName: string
  vehiclePlate: string
  driverName: string | null
}

export function MaintenanceAlerts() {
  const { vehicles, drivers, recharges, fuelRequests, maintenanceIntervals } = useFuelStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogInterval, setDialogInterval] = useState<MaintenanceInterval | null>(null)
  const [dialogKm, setDialogKm] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const { alerts, noDataItems, hasIntervals } = useMemo(() => {
    const alertList: AlertItem[] = []
    const noData: NoDataItem[] = []

    const getVehicleDriverName = (v: any) => {
      if (v.driver) {
        const d = drivers.find((driver) => driver.id === v.driver)
        if (d) return d.name
      }
      if (v.expand?.driver?.name) return v.expand.driver.name
      return null
    }

    for (const v of vehicles) {
      const vIntervals = maintenanceIntervals.filter((mi) => mi.vehicle === v.id)
      if (vIntervals.length === 0) continue

      const driverName = getVehicleDriverName(v)

      const vRecharges = recharges
        .filter((r) => r.vehicle === v.id)
        .sort((a, b) => new Date(b.recharge_date).getTime() - new Date(a.recharge_date).getTime())

      const vRequests = fuelRequests
        .filter((r) => r.vehicle === v.id && r.current_odometer)
        .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())

      const latestRecharge = vRecharges[0]
      const latestRequest = vRequests[0]

      let currentKm = 0
      let hasData = false

      if (latestRecharge && latestRequest) {
        if (new Date(latestRecharge.recharge_date) >= new Date(latestRequest.request_date)) {
          currentKm = latestRecharge.odometer
        } else {
          currentKm = latestRequest.current_odometer ?? 0
        }
        hasData = true
      } else if (latestRecharge) {
        currentKm = latestRecharge.odometer
        hasData = true
      } else if (latestRequest && latestRequest.current_odometer) {
        currentKm = latestRequest.current_odometer
        hasData = true
      }

      if (!hasData) {
        noData.push({ vehicleName: v.name, vehiclePlate: v.plate, driverName })
        continue
      }

      for (const interval of vIntervals) {
        const threshold = interval.last_maintenance_km + interval.interval_km
        const isOverdue = currentKm >= threshold
        const isApproaching = currentKm >= threshold - 500 && currentKm < threshold

        if (isOverdue || isApproaching) {
          alertList.push({
            vehicleId: v.id,
            vehicleName: v.name,
            vehiclePlate: v.plate,
            driverName,
            interval,
            currentKm,
            threshold,
            isOverdue,
            isApproaching,
            kmDiff: currentKm - threshold,
          })
        }
      }
    }

    alertList.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      return Math.abs(b.kmDiff) - Math.abs(a.kmDiff)
    })

    return {
      alerts: alertList,
      noDataItems: noData,
      hasIntervals: maintenanceIntervals.length > 0,
    }
  }, [vehicles, drivers, recharges, fuelRequests, maintenanceIntervals])

  function handleRegister(alert: AlertItem) {
    setDialogInterval(alert.interval)
    setDialogKm(alert.currentKm)
    setDialogOpen(true)
  }

  if (!hasIntervals) {
    return (
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" />
            Alertas de Manutenção
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Intervalo
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Nenhum alerta no momento</p>
          </div>
        </CardContent>
        <MaintenanceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      </Card>
    )
  }

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-500" />
          Alertas de Manutenção
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Intervalo
        </Button>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 && noDataItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-10 w-10 text-emerald-300 mb-3" />
            <p className="text-sm text-slate-500">Tudo em dia! Nenhuma manutenção pendente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.vehicleId}-${alert.interval.id}-${idx}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border transition-colors ${
                  alert.isOverdue ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      alert.isOverdue ? 'text-red-500' : 'text-amber-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{alert.vehicleName}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {alert.vehiclePlate}
                      </span>
                      {alert.driverName ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          <User className="h-3 w-3" />
                          Responsável: {alert.driverName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
                          <User className="h-3 w-3 text-slate-300" />
                          Sem responsável
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={
                          alert.isOverdue
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }
                      >
                        {alert.isOverdue ? 'Vencida' : 'Próxima'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      <strong>{alert.interval.task_name}</strong> —{' '}
                      {alert.isOverdue
                        ? `${Math.abs(alert.kmDiff).toLocaleString('pt-BR')} km em atraso`
                        : `${Math.abs(alert.kmDiff).toLocaleString('pt-BR')} km restantes`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Km atual: {alert.currentKm.toLocaleString('pt-BR')} / Próxima:{' '}
                      {alert.threshold.toLocaleString('pt-BR')}
                    </p>
                    {alert.interval.cost_center && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Centro de Custo: {alert.interval.cost_center}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => handleRegister(alert)}
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  Registrar Manutenção
                </Button>
              </div>
            ))}

            {noDataItems.map((item, idx) => (
              <div
                key={`nodata-${idx}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <p className="text-sm text-slate-500">
                    Nenhum dado de quilometragem disponível para <strong>{item.vehicleName}</strong>{' '}
                    ({item.vehiclePlate})
                  </p>
                </div>
                {item.driverName && (
                  <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 flex-shrink-0">
                    Resp: {item.driverName}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <MaintenanceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        interval={dialogInterval}
        currentKm={dialogKm}
      />
      <MaintenanceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  )
}
