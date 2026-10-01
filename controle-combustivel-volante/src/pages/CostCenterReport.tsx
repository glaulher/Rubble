import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, ArrowUpDown, Building2, Download } from 'lucide-react'
import { getRecharges } from '@/services/recharges'
import { getVehicles } from '@/services/vehicles'
import { getMaintenanceIntervals } from '@/services/maintenance-intervals'
import { exportToCsv } from '@/lib/csv'
import { useRealtime } from '@/hooks/use-realtime'
import { ReportsTabs } from '@/components/reports/reports-tabs'

type SortColumn = 'cost_center' | 'fuel_cost' | 'combined_total'
type SortDirection = 'asc' | 'desc'

export default function CostCenterReport() {
  const [recharges, setRecharges] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [maintenanceIntervals, setMaintenanceIntervals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('fuel_cost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const loadData = async () => {
    try {
      const [r, v, m] = await Promise.all([
        getRecharges(),
        getVehicles(),
        getMaintenanceIntervals(),
      ])
      setRecharges(r)
      setVehicles(v)
      setMaintenanceIntervals(m)
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
  useRealtime('maintenance_intervals', () => loadData())

  const reportData = useMemo(() => {
    const filtered = recharges.filter((r) => {
      const date = new Date(r.recharge_date)
      if (startDate && date < new Date(startDate)) return false
      if (endDate && date > new Date(endDate + 'T23:59:59')) return false
      return true
    })

    const grouped: Record<string, number> = {}
    filtered.forEach((r) => {
      const v = vehicles.find((v) => v.id === r.vehicle)
      const cc = r.cost_center || v?.cost_center || 'Sem Centro de Custo'
      grouped[cc] = (grouped[cc] || 0) + (r.cost || 0)
    })

    const rows = Object.entries(grouped).map(([costCenter, fuelCost]) => ({
      cost_center: costCenter,
      fuel_cost: fuelCost,
      combined_total: fuelCost,
    }))

    rows.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      const av = a[sortColumn]
      const bv = b[sortColumn]
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir
      return ((av as number) - (bv as number)) * dir
    })

    return rows
  }, [recharges, vehicles, startDate, endDate, sortColumn, sortDirection])

  function handleSort(column: SortColumn) {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const maintenanceByCostCenter = useMemo(() => {
    const grouped: Record<string, number> = {}
    maintenanceIntervals.forEach((m) => {
      const cc = m.cost_center || 'Sem Centro de Custo'
      grouped[cc] = (grouped[cc] || 0) + 1
    })
    return grouped
  }, [maintenanceIntervals])

  function handleExport() {
    exportToCsv(
      'relatorio-centro-de-custo.csv',
      ['Centro de Custo', 'Custo Combustível', 'Manutenções (qtd)', 'Total'],
      reportData.map((row) => [
        row.cost_center,
        row.fuel_cost.toFixed(2),
        maintenanceByCostCenter[row.cost_center] || 0,
        row.combined_total.toFixed(2),
      ]),
    )
  }

  const totalFuelCost = reportData.reduce((acc, r) => acc + r.fuel_cost, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Carregando relatório...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-slate-700 font-medium">Erro ao carregar relatório.</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Relatório por Centro de Custo
          </h1>
          <p className="text-sm text-slate-500">
            Análise de custos de combustível agrupados por centro de custo.
          </p>
        </div>
      </div>

      <ReportsTabs />

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">
            Filtro de Período
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Data Inicial</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Data Final</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Resumo por Centro de Custo
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={reportData.length === 0}
            >
              <Download className="h-4 w-4 mr-1" /> Exportar CSV
            </Button>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Geral: </span>
              <span className="font-bold text-slate-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalFuelCost,
                )}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort('cost_center')}
                    >
                      Centro de Custo <ArrowUpDown className="h-3 w-3 ml-1 inline" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort('fuel_cost')}
                    >
                      Custo Combustível <ArrowUpDown className="h-3 w-3 ml-1 inline" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Manutenções (qtd)</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort('combined_total')}
                    >
                      Total Combined <ArrowUpDown className="h-3 w-3 ml-1 inline" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      Nenhum dado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row) => (
                    <TableRow
                      key={row.cost_center}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700">
                        {row.cost_center}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(row.fuel_cost)}
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {maintenanceByCostCenter[row.cost_center] || 0}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(row.combined_total)}
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
