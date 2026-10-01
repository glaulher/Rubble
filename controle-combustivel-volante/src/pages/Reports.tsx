import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import useFuelStore from '@/stores/use-fuel-store'
import { Car, Fuel, DollarSign, FileBarChart, Loader2, AlertCircle, BarChart3 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExportCard } from '@/components/reports/export-card'
import { ReportsTabs } from '@/components/reports/reports-tabs'
import { exportToCsv } from '@/lib/csv'

export default function Reports() {
  const { vehicles, recharges, fuelRequests, drivers, loading, error } = useFuelStore()
  const [costCenterFilter, setCostCenterFilter] = useState('all')

  const distinctCostCenters = useMemo(() => {
    const centers = new Set<string>()
    vehicles.forEach((v: any) => {
      if (v.cost_center) centers.add(v.cost_center)
    })
    fuelRequests.forEach((r: any) => {
      if (r.cost_center) centers.add(r.cost_center)
    })
    recharges.forEach((r: any) => {
      if (r.cost_center) centers.add(r.cost_center)
    })
    return Array.from(centers).sort()
  }, [vehicles, fuelRequests, recharges])

  const matchesCC = (recordCC: string, vehicleId: string) => {
    if (costCenterFilter === 'all') return true
    if (recordCC === costCenterFilter) return true
    const v = vehicles.find((v: any) => v.id === vehicleId)
    return v?.cost_center === costCenterFilter
  }

  const filteredRecharges = useMemo(
    () => recharges.filter((r: any) => matchesCC(r.cost_center, r.vehicle)),
    [recharges, vehicles, costCenterFilter],
  )
  const filteredFuelRequests = useMemo(
    () => fuelRequests.filter((r: any) => matchesCC(r.cost_center, r.vehicle)),
    [fuelRequests, vehicles, costCenterFilter],
  )
  const filteredVehicles = useMemo(
    () =>
      costCenterFilter === 'all'
        ? vehicles
        : vehicles.filter((v: any) => v.cost_center === costCenterFilter),
    [vehicles, costCenterFilter],
  )

  const summaryStats = useMemo(() => {
    const totalCost = filteredRecharges.reduce((acc: number, r: any) => acc + r.cost, 0)
    const totalLiters = filteredRecharges.reduce((acc: number, r: any) => acc + r.liters, 0)
    const valid = filteredRecharges.filter((r: any) => r.km_per_liter > 0)
    const avg =
      valid.length > 0
        ? (valid.reduce((acc: number, r: any) => acc + r.km_per_liter, 0) / valid.length).toFixed(1)
        : '0.0'
    return {
      totalVehicles: filteredVehicles.length,
      totalRequests: filteredFuelRequests.length,
      totalRecharges: filteredRecharges.length,
      totalCost,
      totalLiters,
      avgConsumption: avg,
    }
  }, [filteredVehicles, filteredRecharges, filteredFuelRequests])

  const chartData = useMemo(
    () =>
      filteredVehicles.map((v: any) => {
        const vR = filteredRecharges.filter((r: any) => r.vehicle === v.id)
        return {
          name: v.plate,
          custo: vR.reduce((acc: number, r: any) => acc + r.cost, 0),
          litros: vR.reduce((acc: number, r: any) => acc + r.liters, 0),
        }
      }),
    [filteredVehicles, filteredRecharges],
  )

  const chartConfig = { custo: { label: 'Custo (R$)', color: 'hsl(var(--primary))' } }

  const vehicleSummary = useMemo(
    () =>
      filteredVehicles.map((v: any) => {
        const vR = filteredRecharges.filter((r: any) => r.vehicle === v.id)
        const valid = vR.filter((r: any) => r.km_per_liter > 0)
        const avg =
          valid.length > 0
            ? (
                valid.reduce((acc: number, r: any) => acc + r.km_per_liter, 0) / valid.length
              ).toFixed(1)
            : '0.0'
        const latestOdo =
          vR.sort(
            (a: any, b: any) =>
              new Date(b.recharge_date).getTime() - new Date(a.recharge_date).getTime(),
          )[0]?.odometer ?? 0
        return {
          id: v.id,
          name: v.name,
          plate: v.plate,
          totalRecharges: vR.length,
          totalLiters: vR.reduce((acc: number, r: any) => acc + r.liters, 0),
          totalCost: vR.reduce((acc: number, r: any) => acc + r.cost, 0),
          avgKmPerLiter: avg,
          latestOdometer: latestOdo,
        }
      }),
    [filteredVehicles, filteredRecharges],
  )

  async function exportFuelRequests(
    start: string,
    end: string,
    vehicle: string,
    driver: string,
    costCenter: string,
  ) {
    let data = [...fuelRequests]
    if (vehicle !== 'all') data = data.filter((r: any) => r.vehicle === vehicle)
    if (driver !== 'all') data = data.filter((r: any) => r.driver === driver)
    if (costCenter !== 'all')
      data = data.filter(
        (r: any) =>
          r.cost_center === costCenter ||
          vehicles.find((v: any) => v.id === r.vehicle)?.cost_center === costCenter,
      )
    if (start) data = data.filter((r: any) => new Date(r.request_date) >= new Date(start))
    if (end) data = data.filter((r: any) => new Date(r.request_date) <= new Date(end))
    exportToCsv(
      'solicitacoes.csv',
      [
        'Data',
        'Veículo',
        'Motorista',
        'Destino',
        'Centro de Custo',
        'Km Atual',
        'Km Último Abastecimento',
        'Data Último Abastecimento',
        'Status',
      ],
      data.map((r: any) => [
        r.request_date,
        vehicles.find((v: any) => v.id === r.vehicle)?.name ?? '',
        drivers.find((d: any) => d.id === r.driver)?.name ?? '',
        r.destination,
        r.cost_center ?? '',
        r.current_odometer ?? '',
        r.last_refuel_odometer ?? '',
        r.last_refuel_date ?? '',
        r.status,
      ]),
    )
  }

  async function exportRecharges(
    start: string,
    end: string,
    vehicle: string,
    driver: string,
    costCenter: string,
  ) {
    let data = [...recharges]
    if (vehicle !== 'all') data = data.filter((r: any) => r.vehicle === vehicle)
    if (driver !== 'all') data = data.filter((r: any) => r.driver === driver)
    if (costCenter !== 'all')
      data = data.filter(
        (r: any) =>
          r.cost_center === costCenter ||
          vehicles.find((v: any) => v.id === r.vehicle)?.cost_center === costCenter,
      )
    if (start) data = data.filter((r: any) => new Date(r.recharge_date) >= new Date(start))
    if (end) data = data.filter((r: any) => new Date(r.recharge_date) <= new Date(end))
    exportToCsv(
      'reabastecimentos.csv',
      ['Data', 'Veículo', 'Motorista', 'Centro de Custo', 'Litros', 'Custo', 'Odômetro', 'Km/L'],
      data.map((r: any) => [
        r.recharge_date,
        vehicles.find((v: any) => v.id === r.vehicle)?.name ?? '',
        drivers.find((d: any) => d.id === r.driver)?.name ?? '',
        r.cost_center ?? '',
        r.liters,
        r.cost,
        r.odometer,
        r.km_per_liter,
      ]),
    )
  }

  async function exportVehicles(
    start: string,
    end: string,
    vehicle: string,
    driver: string,
    costCenter: string,
  ) {
    let data = [...vehicles]
    if (costCenter !== 'all') data = data.filter((v: any) => v.cost_center === costCenter)
    exportToCsv(
      'veiculos.csv',
      ['Nome', 'Placa', 'Responsável', 'Centro de Custo'],
      data.map((v: any) => {
        const driverName =
          (v.driver ? drivers.find((d: any) => d.id === v.driver)?.name : null) ||
          v.expand?.driver?.name ||
          ''
        return [v.name, v.plate, driverName, v.cost_center || '']
      }),
    )
  }

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-3 text-slate-500">Carregando relatórios...</span>
      </div>
    )
  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium">Erro ao carregar relatórios.</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Recarregar página
        </Button>
      </div>
    )

  const hasNoData = vehicles.length === 0 && recharges.length === 0 && fuelRequests.length === 0
  if (hasNoData)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500">
            Análise consolidada de consumo e custos da frota.
          </p>
        </div>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-700">Nenhum relatório encontrado</p>
            <p className="text-sm text-slate-400 mt-1">
              Cadastre veículos, abastecimentos e solicitações para visualizar os relatórios.
            </p>
          </CardContent>
        </Card>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500">
            Análise consolidada de consumo e custos da frota.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
            Centro de Custo:
          </span>
          <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os centros de custo</SelectItem>
              {distinctCostCenters.map((cc) => (
                <SelectItem key={cc} value={cc}>
                  {cc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ReportsTabs />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Veículos',
            value: summaryStats.totalVehicles,
            sub: 'Veículos cadastrados',
            icon: Car,
            color: 'text-primary',
          },
          {
            title: 'Abastecimentos',
            value: summaryStats.totalRecharges,
            sub: `${summaryStats.totalLiters.toFixed(0)} litros total`,
            icon: Fuel,
            color: 'text-emerald-500',
          },
          {
            title: 'Custo Total',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              summaryStats.totalCost,
            ),
            sub: 'Gasto com combustível',
            icon: DollarSign,
            color: 'text-amber-500',
          },
          {
            title: 'Consumo Médio',
            value: `${summaryStats.avgConsumption} KM/L`,
            sub: 'Média da frota',
            icon: FileBarChart,
            color: 'text-violet-500',
          },
        ].map((card) => (
          <Card key={card.title} className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Custo por Veículo</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-slate-400">Nenhum dado de custo disponível.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="custo" fill="var(--color-custo)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Resumo por Veículo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Abastecimentos</TableHead>
                  <TableHead>Total Litros</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead>Odômetro Atual</TableHead>
                  <TableHead>Consumo Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Nenhum veículo cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicleSummary.map((v) => (
                    <TableRow key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-medium text-slate-700">{v.name}</TableCell>
                      <TableCell>{v.plate}</TableCell>
                      <TableCell>{v.totalRecharges}</TableCell>
                      <TableCell>{v.totalLiters} L</TableCell>
                      <TableCell className="font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(v.totalCost)}
                      </TableCell>
                      <TableCell>{v.latestOdometer.toLocaleString('pt-BR')} km</TableCell>
                      <TableCell>{v.avgKmPerLiter} km/l</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Exportar Dados (CSV)</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ExportCard
            title="Solicitações de Combustível"
            description="Exporte as solicitações filtradas por período, veículo e motorista."
            showVehicleFilter
            showDriverFilter
            showCostCenterFilter
            costCenters={distinctCostCenters}
            vehicles={vehicles}
            drivers={drivers}
            onExport={exportFuelRequests}
          />
          <ExportCard
            title="Abastecimentos"
            description="Exporte os abastecimentos filtrados por período, veículo e motorista."
            showVehicleFilter
            showDriverFilter
            showCostCenterFilter
            costCenters={distinctCostCenters}
            vehicles={vehicles}
            drivers={drivers}
            onExport={exportRecharges}
          />
          <ExportCard
            title="Veículos"
            description="Exporte todos os veículos cadastrados no sistema."
            showVehicleFilter={false}
            showCostCenterFilter
            costCenters={distinctCostCenters}
            vehicles={vehicles}
            onExport={exportVehicles}
          />
        </div>
      </div>
    </div>
  )
}
