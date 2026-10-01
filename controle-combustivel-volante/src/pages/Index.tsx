import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import useFuelStore from '@/stores/use-fuel-store'
import {
  DollarSign,
  AlertCircle,
  Loader2,
  Car,
  Fuel,
  FileText,
  Filter,
  X,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MaintenanceAlerts } from '@/components/maintenance/maintenance-alerts'

export default function Index() {
  const { recharges, fuelRequests, vehicles, drivers, loading, error } = useFuelStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('all')

  const safeVehicles = vehicles ?? []
  const safeRecharges = recharges ?? []
  const safeRequests = fuelRequests ?? []

  const filteredRecharges = useMemo(() => {
    return safeRecharges.filter((r) => {
      if (selectedVehicle !== 'all' && r.vehicle !== selectedVehicle) return false
      if (startDate && new Date(r.recharge_date) < new Date(startDate)) return false
      if (endDate && new Date(r.recharge_date) > new Date(endDate)) return false
      return true
    })
  }, [safeRecharges, selectedVehicle, startDate, endDate])

  const filteredRequests = useMemo(() => {
    return safeRequests.filter((r) => {
      if (selectedVehicle !== 'all' && r.vehicle !== selectedVehicle) return false
      if (startDate && new Date(r.request_date) < new Date(startDate)) return false
      if (endDate && new Date(r.request_date) > new Date(endDate)) return false
      return true
    })
  }, [safeRequests, selectedVehicle, startDate, endDate])

  const hasFilters = startDate || endDate || selectedVehicle !== 'all'

  const getVehicleDriverName = (v: any) => {
    if (v.driver) {
      const d = drivers.find((driver) => driver.id === v.driver)
      if (d) return d.name
    }
    if (v.expand?.driver?.name) return v.expand.driver.name
    return null
  }

  const selectedVehicleObj = useMemo(() => {
    if (selectedVehicle === 'all') return null
    return safeVehicles.find((v) => v.id === selectedVehicle) || null
  }, [safeVehicles, selectedVehicle])

  const stats = useMemo(() => {
    const validConsumption = filteredRecharges.filter((r) => r.km_per_liter > 0)
    const avgConsumption =
      validConsumption.length > 0
        ? (
            validConsumption.reduce((acc, r) => acc + r.km_per_liter, 0) / validConsumption.length
          ).toFixed(1)
        : '0.0'
    const totalSpent = filteredRecharges.reduce((acc, r) => acc + r.cost, 0)
    const pendingRequests = filteredRequests.filter((r) => r.status === 'Aberto').length

    return {
      avgConsumption,
      totalSpent,
      pendingRequests,
      totalVehicles: safeVehicles.length,
      totalRequests: filteredRequests.length,
      totalRecharges: filteredRecharges.length,
    }
  }, [filteredRecharges, filteredRequests, safeVehicles])

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; liters: number; cost: number }>()
    const sorted = [...filteredRecharges].sort(
      (a, b) => new Date(a.recharge_date).getTime() - new Date(b.recharge_date).getTime(),
    )

    sorted.forEach((r) => {
      const existing = dataMap.get(r.recharge_date)
      if (existing) {
        existing.liters += r.liters
        existing.cost += r.cost
      } else {
        dataMap.set(r.recharge_date, {
          date: r.recharge_date,
          liters: r.liters,
          cost: r.cost,
        })
      }
    })

    return Array.from(dataMap.values())
  }, [filteredRecharges])

  const chartConfig = {
    liters: { label: 'Litros', color: 'hsl(var(--primary))' },
    cost: { label: 'Custo (R$)', color: '#10b981' },
  }

  const consumptionChartData = useMemo(() => {
    const dataMap = new Map<string, Record<string, string | number>>()
    filteredRecharges
      .filter((r) => r.km_per_liter > 0)
      .sort((a, b) => new Date(a.recharge_date).getTime() - new Date(b.recharge_date).getTime())
      .forEach((r) => {
        const existing = dataMap.get(r.recharge_date) || { date: r.recharge_date }
        existing[r.vehicle] = r.km_per_liter
        dataMap.set(r.recharge_date, existing)
      })
    return Array.from(dataMap.values())
  }, [filteredRecharges])

  const consumptionChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    safeVehicles.forEach((v, i) => {
      config[v.id] = { label: v.name, color: colors[i % colors.length] }
    })
    return config
  }, [safeVehicles])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aberto':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Aberto
          </Badge>
        )
      case 'Em Andamento':
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
          >
            Em Andamento
          </Badge>
        )
      case 'Concluído':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Concluído
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const recentActivity = [...filteredRequests]
    .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-3 text-slate-500">Carregando dados...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium">Erro ao carregar dados. Tente novamente.</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const hasNoData =
    safeVehicles.length === 0 && safeRequests.length === 0 && safeRecharges.length === 0

  if (hasNoData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral e fiscalização da frota Volante.</p>
        </div>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-700">Nenhum dado encontrado</p>
            <p className="text-sm text-slate-400 mt-1">
              Cadastre veículos, abastecimentos e solicitações para visualizar o dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasNoFilteredData =
    filteredRequests.length === 0 && filteredRecharges.length === 0 && hasFilters

  if (hasNoFilteredData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral e fiscalização da frota Volante.</p>
        </div>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Filter className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-700">
              Nenhum registro encontrado para o filtro selecionado
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSelectedVehicle('all')
              }}
            >
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral e fiscalização da frota Volante.</p>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Filter className="h-4 w-4" />
              Filtros
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                placeholder="Data inicial"
              />
              <span className="text-slate-400 text-sm">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
                placeholder="Data final"
              />
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="w-auto min-w-[180px]">
                  <SelectValue placeholder="Todos os veículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  {safeVehicles.map((v) => {
                    const driverName = getVehicleDriverName(v)
                    return (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.plate}){driverName ? ` • ${driverName}` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    setSelectedVehicle('all')
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {selectedVehicleObj ? 'Veículo Selecionado' : 'Veículos'}
            </CardTitle>
            <Car className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {selectedVehicleObj ? (
              <div>
                <div className="text-lg font-bold text-slate-900 truncate">
                  {selectedVehicleObj.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                  <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <span className="font-medium truncate">
                    {getVehicleDriverName(selectedVehicleObj) || (
                      <span className="italic text-slate-400">Sem responsável</span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.totalVehicles}</div>
                <p className="text-xs text-slate-500 mt-1">Veículos cadastrados</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Solicitações</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalRequests}</div>
            <p className="text-xs text-slate-500 mt-1">{stats.pendingRequests} aguardando</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Abastecimentos</CardTitle>
            <Fuel className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalRecharges}</div>
            <p className="text-xs text-slate-500 mt-1">Registros de recarga</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Gasto</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.totalSpent)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total de abastecimentos</p>
          </CardContent>
        </Card>
      </div>

      <MaintenanceAlerts />

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-1 md:col-span-4 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Consumo vs Custo</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-liters)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-liters)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
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
                      tickFormatter={(value) => `${value}`}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="liters"
                      stroke="var(--color-liters)"
                      fillOpacity={1}
                      fill="url(#colorLiters)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="var(--color-cost)"
                      fillOpacity={1}
                      fill="url(#colorCost)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3 border-none shadow-sm bg-white flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-4">
              {recentActivity.map((req) => {
                const vehicle = safeVehicles.find((v) => v.id === req.vehicle)
                const reqDriverName =
                  drivers.find((d) => d.id === req.driver)?.name ||
                  req.driver ||
                  (vehicle ? getVehicleDriverName(vehicle) : null) ||
                  'Não informado'
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <p className="text-sm font-medium text-slate-900">{reqDriverName}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {vehicle?.name} ({vehicle?.plate}) - {req.destination}
                      </p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                )
              })}
              {recentActivity.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-4">
                  Nenhuma atividade recente.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Consumo por Veículo (km/l)
          </CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          {consumptionChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <p className="text-sm text-slate-400">
                Nenhum dado disponível para o período selecionado
              </p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ChartContainer config={consumptionChartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={consumptionChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {safeVehicles.map((v) => {
                      const dName = getVehicleDriverName(v)
                      return (
                        <Line
                          key={v.id}
                          type="monotone"
                          dataKey={v.id}
                          stroke={`var(--color-${v.id})`}
                          name={dName ? `${v.name} (${dName})` : v.name}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
