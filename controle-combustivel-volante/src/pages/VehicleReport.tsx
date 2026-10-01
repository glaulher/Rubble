import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle, Download, Car } from 'lucide-react'
import { getRecharges } from '@/services/recharges'
import { getFuelRequests } from '@/services/fuel-requests'
import { getVehicles } from '@/services/vehicles'
import { getDrivers } from '@/services/drivers'
import { useRealtime } from '@/hooks/use-realtime'
import { exportToCsv } from '@/lib/csv'
import {
  computeTotalKm,
  computeAvgKmPerLiter,
  formatCurrency,
  filterByDateRange,
} from '@/lib/report-utils'
import { ReportsTabs } from '@/components/reports/reports-tabs'
import { SortHeader } from '@/components/reports/sort-header'

type SortColumn =
  | 'name'
  | 'plate'
  | 'total_liters'
  | 'total_cost'
  | 'total_km'
  | 'avg_km_l'
  | 'recharges_count'
  | 'fuel_requests_count'
  | 'current_odometer'
type SortDir = 'asc' | 'desc'

export default function VehicleReport() {
  const [searchParams] = useSearchParams()
  const [recharges, setRecharges] = useState<any[]>([])
  const [fuelRequests, setFuelRequests] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [driverFilter, setDriverFilter] = useState(searchParams.get('driver') || 'all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('total_cost')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const loadData = async () => {
    try {
      const [r, f, v, d] = await Promise.all([
        getRecharges(),
        getFuelRequests(),
        getVehicles(),
        getDrivers(),
      ])
      setRecharges(r)
      setFuelRequests(f)
      setVehicles(v)
      setDrivers(d)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('recharges', () => loadData())
  useRealtime('fuel_requests', () => loadData())

  const reportData = useMemo(() => {
    let fRecharges = filterByDateRange(recharges, startDate, endDate, 'recharge_date').filter(
      (r) => r.vehicle,
    )
    let fRequests = filterByDateRange(fuelRequests, startDate, endDate, 'request_date').filter(
      (r) => r.vehicle,
    )
    if (driverFilter !== 'all') {
      fRecharges = fRecharges.filter((r) => r.driver === driverFilter)
      fRequests = fRequests.filter((r) => r.driver === driverFilter)
    }
    const vehicleMap = new Map<string, { recharges: any[]; fuelRequestCount: number }>()
    vehicles.forEach((v) => vehicleMap.set(v.id, { recharges: [], fuelRequestCount: 0 }))
    fRecharges.forEach((r) => {
      if (!vehicleMap.has(r.vehicle))
        vehicleMap.set(r.vehicle, { recharges: [], fuelRequestCount: 0 })
      vehicleMap.get(r.vehicle)!.recharges.push(r)
    })
    fRequests.forEach((r) => {
      if (!vehicleMap.has(r.vehicle))
        vehicleMap.set(r.vehicle, { recharges: [], fuelRequestCount: 0 })
      vehicleMap.get(r.vehicle)!.fuelRequestCount++
    })
    const rows = Array.from(vehicleMap.entries())
      .filter(([, data]) => data.recharges.length > 0 || data.fuelRequestCount > 0)
      .map(([vehicleId, data]) => {
        const vehicle = vehicles.find((v) => v.id === vehicleId)
        const totalLiters = data.recharges.reduce((acc, r) => acc + (r.liters || 0), 0)
        const totalCost = data.recharges.reduce((acc, r) => acc + (r.cost || 0), 0)
        const totalKm = computeTotalKm(data.recharges)
        const sortedByDate = [...data.recharges].sort(
          (a, b) => new Date(b.recharge_date).getTime() - new Date(a.recharge_date).getTime(),
        )
        const currentOdometer = sortedByDate[0]?.odometer ?? 0
        const driverName =
          (vehicle?.driver ? drivers.find((d) => d.id === vehicle.driver)?.name : null) ||
          vehicle?.expand?.driver?.name ||
          ''
        return {
          vehicle_id: vehicleId,
          name: vehicle?.name || 'Veículo desconhecido',
          plate: vehicle?.plate || '—',
          responsible_driver: driverName,
          total_liters: totalLiters,
          total_cost: totalCost,
          total_km: totalKm,
          avg_km_l: computeAvgKmPerLiter(totalKm, totalLiters),
          recharges_count: data.recharges.length,
          fuel_requests_count: data.fuelRequestCount,
          current_odometer: currentOdometer,
        }
      })
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const av = a[sortColumn]
      const bv = b[sortColumn]
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir
      return ((av as number) - (bv as number)) * dir
    })
    return rows
  }, [recharges, fuelRequests, vehicles, startDate, endDate, driverFilter, sortColumn, sortDir])

  function handleSort(col: SortColumn) {
    if (sortColumn === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortColumn(col)
      setSortDir('desc')
    }
  }

  function handleExport() {
    exportToCsv(
      'relatorio-por-veiculo.csv',
      [
        'Veículo',
        'Placa',
        'Responsável',
        'Total Litros',
        'Custo Total',
        'KM Total',
        'Média KM/L',
        'Abastecimentos',
        'Solicitações',
        'Odômetro Atual',
      ],
      reportData.map((r) => [
        r.name,
        r.plate,
        r.responsible_driver,
        r.total_liters.toFixed(2),
        r.total_cost.toFixed(2),
        r.total_km.toFixed(0),
        r.avg_km_l.toFixed(1),
        r.recharges_count,
        r.fuel_requests_count,
        r.current_odometer,
      ]),
    )
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Carregando relatório...</span>
      </div>
    )

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium">Erro ao carregar relatório.</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatório por Veículo</h1>
        <p className="text-sm text-slate-500">Análise de consumo e custos agrupados por veículo.</p>
      </div>
      <ReportsTabs />
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-6">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Data Inicial</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Data Final</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Motorista</label>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os motoristas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={handleExport} disabled={reportData.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-100 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>
                    <SortHeader
                      label="Veículo"
                      active={sortColumn === 'name'}
                      onClick={() => handleSort('name')}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="Placa"
                      active={sortColumn === 'plate'}
                      onClick={() => handleSort('plate')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Total Litros"
                      active={sortColumn === 'total_liters'}
                      onClick={() => handleSort('total_liters')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Custo Total"
                      active={sortColumn === 'total_cost'}
                      onClick={() => handleSort('total_cost')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="KM Total"
                      active={sortColumn === 'total_km'}
                      onClick={() => handleSort('total_km')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Média KM/L"
                      active={sortColumn === 'avg_km_l'}
                      onClick={() => handleSort('avg_km_l')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Abastecimentos"
                      active={sortColumn === 'recharges_count'}
                      onClick={() => handleSort('recharges_count')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Solicitações"
                      active={sortColumn === 'fuel_requests_count'}
                      onClick={() => handleSort('fuel_requests_count')}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Odômetro Atual"
                      active={sortColumn === 'current_odometer'}
                      onClick={() => handleSort('current_odometer')}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      <Car className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      Nenhum registro encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row) => (
                    <TableRow
                      key={row.vehicle_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700">{row.name}</TableCell>
                      <TableCell className="text-slate-600">{row.plate}</TableCell>
                      <TableCell className="text-right text-slate-900">
                        {row.total_liters.toFixed(1)} L
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {formatCurrency(row.total_cost)}
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {row.total_km.toLocaleString('pt-BR')} km
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {row.avg_km_l.toFixed(1)} km/l
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {row.recharges_count}
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {row.fuel_requests_count}
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {row.current_odometer.toLocaleString('pt-BR')} km
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
