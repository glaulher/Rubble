import { useMemo } from 'react'
import { Bell, AlertTriangle, Wrench, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import useFuelStore from '@/stores/use-fuel-store'

type Alert = {
  vehicleName: string
  vehiclePlate: string
  driverName: string | null
  taskName: string
  currentKm: number
  threshold: number
  isOverdue: boolean
  kmDiff: number
}

export function NotificationBell() {
  const { vehicles, drivers, recharges, fuelRequests, maintenanceIntervals } = useFuelStore()

  const { alerts, count } = useMemo(() => {
    const alertList: Alert[] = []

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

      if (!hasData) continue

      const driverName = getVehicleDriverName(v)

      for (const interval of vIntervals) {
        const threshold = interval.last_maintenance_km + interval.interval_km
        const isOverdue = currentKm >= threshold
        const isApproaching = currentKm >= threshold - 1000 && currentKm < threshold

        if (isOverdue || isApproaching) {
          alertList.push({
            vehicleName: v.name,
            vehiclePlate: v.plate,
            driverName,
            taskName: interval.task_name,
            currentKm,
            threshold,
            isOverdue,
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

    return { alerts: alertList, count: alertList.length }
  }, [vehicles, drivers, recharges, fuelRequests, maintenanceIntervals])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:text-slate-700"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span
              className={`absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${count > 0 ? 'bg-red-500' : 'bg-slate-400'}`}
            >
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de Manutenção
          </h3>
        </div>
        <div className="max-h-80 overflow-auto">
          {alerts.length === 0 ? (
            <div className="p-6 text-center">
              <Wrench className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Tudo em dia! Nenhuma manutenção pendente.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`p-3 ${alert.isOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">
                        {alert.vehicleName}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-white px-1 py-0.5 rounded border">
                        {alert.vehiclePlate}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        alert.isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }
                    >
                      {alert.isOverdue ? 'Vencido' : 'Próximo'}
                    </Badge>
                  </div>
                  {alert.driverName && (
                    <div className="flex items-center gap-1 text-xs text-blue-700 font-medium mb-1">
                      <User className="h-3 w-3" />
                      <span>Responsável: {alert.driverName}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 font-medium">{alert.taskName}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <AlertTriangle
                      className={`h-3 w-3 ${alert.isOverdue ? 'text-red-500' : 'text-amber-500'}`}
                    />
                    {alert.isOverdue
                      ? `${Math.abs(alert.kmDiff).toLocaleString('pt-BR')} km em atraso`
                      : `${Math.abs(alert.kmDiff).toLocaleString('pt-BR')} km restantes`}
                    <span className="text-slate-400 ml-1">
                      ({alert.currentKm.toLocaleString('pt-BR')}/
                      {alert.threshold.toLocaleString('pt-BR')} km)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
