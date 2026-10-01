import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Loader2 } from 'lucide-react'
import type { Vehicle, Driver } from '@/stores/use-fuel-store'

export function ExportCard({
  title,
  description,
  showVehicleFilter,
  showDriverFilter,
  showCostCenterFilter,
  vehicles,
  drivers,
  costCenters,
  onExport,
}: {
  title: string
  description: string
  showVehicleFilter: boolean
  showDriverFilter?: boolean
  showCostCenterFilter?: boolean
  vehicles: Vehicle[]
  drivers?: Driver[]
  costCenters?: string[]
  onExport: (
    start: string,
    end: string,
    vehicle: string,
    driver: string,
    costCenter: string,
  ) => Promise<void>
}) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [vehicle, setVehicle] = useState('all')
  const [driver, setDriver] = useState('all')
  const [costCenter, setCostCenter] = useState('all')
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      await onExport(start, end, vehicle, driver, costCenter)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data Inicial</label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Data Final</label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        {showVehicleFilter && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Veículo</label>
            <Select value={vehicle} onValueChange={setVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os veículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} ({v.plate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showDriverFilter && drivers && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Motorista</label>
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os motoristas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showCostCenterFilter && costCenters && (
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Centro de Custo</label>
            <Select value={costCenter} onValueChange={setCostCenter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os centros de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os centros de custo</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc} value={cc}>
                    {cc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button className="w-full" variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar CSV
        </Button>
      </CardContent>
    </Card>
  )
}
