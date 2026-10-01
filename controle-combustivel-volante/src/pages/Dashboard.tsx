import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useFuelStore from '@/stores/use-fuel-store'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, AlertCircle, DollarSign, Fuel, Gauge, Repeat, RotateCcw } from 'lucide-react'

const PIE_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
]
const currency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Dashboard() {
  const { recharges, vehicles, drivers, loading, error } = useFuelStore()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  useRealtime('recharges', () => {})

  const filtered = useMemo(
    () =>
      recharges.filter((r: any) => {
        const date = new Date(r.recharge_date)
        if (startDate && date < new Date(startDate)) return false
        if (endDate && date > new Date(endDate + 'T23:59:59')) return false
        return true
      }),
    [recharges, startDate, endDate],
  )

  const costCenterData = useMemo(() => {
    const grouped: Record<string, number> = {}
    filtered.forEach((r: any) => {
      const v = vehicles.find((veh: any) => veh.id === r.vehicle)
      const cc = r.cost_center || v?.cost_center || 'Sem Centro de Custo'
      grouped[cc] = (grouped[cc] || 0) + (r.cost || 0)
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [filtered, vehicles])

  const driverData = useMemo(() => {
    const grouped: Record<string, number> = {}
    filtered.forEach((r: any) => {
      if (!r.driver) return
      const name = drivers.find((d: any) => d.id === r.driver)?.name || 'Desconhecido'
      grouped[name] = (grouped[name] || 0) + (r.cost || 0)
    })
    return Object.entries(grouped).map(([name, custo]) => ({ name, custo }))
  }, [filtered, drivers])

  const vehicleData = useMemo(() => {
    const grouped: Record<
      string,
      { plate: string; name: string; driverName: string; custo: number }
    > = {}
    filtered.forEach((r: any) => {
      const v = vehicles.find((veh: any) => veh.id === r.vehicle)
      const plate = v ? v.plate : 'Desconhecido'
      const name = v ? v.name : ''
      let driverName = ''
      if (v?.driver) {
        driverName = drivers.find((d: any) => d.id === v.driver)?.name || ''
      }
      if (!driverName && v?.expand?.driver?.name) {
        driverName = v.expand.driver.name
      }
      if (!grouped[plate]) {
        grouped[plate] = { plate, name, driverName, custo: 0 }
      }
      grouped[plate].custo += r.cost || 0
    })
    return Object.values(grouped).map((item) => ({
      name: item.driverName ? `${item.plate} (${item.driverName})` : item.plate,
      rawPlate: item.plate,
      vehicleName: item.name,
      driverName: item.driverName,
      custo: item.custo,
    }))
  }, [filtered, vehicles, drivers])

  const summary = useMemo(() => {
    const totalCost = filtered.reduce((a: number, r: any) => a + (r.cost || 0), 0)
    const totalLiters = filtered.reduce((a: number, r: any) => a + (r.liters || 0), 0)
    const sorted = [...filtered].sort(
      (a: any, b: any) => new Date(a.recharge_date).getTime() - new Date(b.recharge_date).getTime(),
    )
    const totalKm =
      sorted.length > 1 ? Math.max(0, sorted[sorted.length - 1].odometer - sorted[0].odometer) : 0
    return { totalCost, totalLiters, totalKm, count: filtered.length }
  }, [filtered])

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Carregando dashboard...</span>
      </div>
    )
  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium">Erro ao carregar dados.</p>
      </div>
    )

  const pieConfig = { value: { label: 'Custo' } }
  const barConfig = { custo: { label: 'Custo (R$)', color: 'hsl(var(--primary))' } }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Consolidado</h1>
        <p className="text-sm text-slate-500">
          Visão geral de custos por centro de custo, motorista e veículo.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col sm:flex-row gap-4 pt-6 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Data Inicial</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Data Final</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStartDate('')
              setEndDate('')
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Custo Total',
            value: currency(summary.totalCost),
            icon: DollarSign,
            color: 'text-amber-500',
          },
          {
            title: 'Total Litros',
            value: `${summary.totalLiters.toFixed(1)} L`,
            icon: Fuel,
            color: 'text-emerald-500',
          },
          {
            title: 'Total KM',
            value: `${summary.totalKm.toLocaleString('pt-BR')} km`,
            icon: Gauge,
            color: 'text-primary',
          },
          { title: 'Abastecimentos', value: summary.count, icon: Repeat, color: 'text-violet-500' },
        ].map((c) => (
          <Card key={c.title} className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Custo por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            {costCenterData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Sem dados.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ChartContainer config={pieConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costCenterData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {costCenterData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Custo por Motorista
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            {driverData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Sem dados.</p>
            ) : (
              <div className="h-[300px] w-full">
                <ChartContainer config={barConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={driverData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                        tickFormatter={(v) => `R${v}`}
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
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Custo por Veículo</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          {vehicleData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Sem dados.</p>
          ) : (
            <div className="h-[300px] w-full">
              <ChartContainer config={barConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      tickFormatter={(v) => `R${v}`}
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
          <CardTitle className="text-lg font-semibold text-slate-800">Resumo Consolidado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-slate-700">Custo Total</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {currency(summary.totalCost)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-700">Total Litros</TableCell>
                  <TableCell className="text-right text-slate-900">
                    {summary.totalLiters.toFixed(1)} L
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-700">Total Quilômetros</TableCell>
                  <TableCell className="text-right text-slate-900">
                    {summary.totalKm.toLocaleString('pt-BR')} km
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-700">Nº de Abastecimentos</TableCell>
                  <TableCell className="text-right text-slate-900">{summary.count}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
