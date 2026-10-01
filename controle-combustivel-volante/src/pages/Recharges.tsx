import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, Loader2, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import useFuelStore from '@/stores/use-fuel-store'
import { toast } from 'sonner'
import { RechargeFormDialog } from '@/components/recharges/recharge-form-dialog'
import { EditRechargeDialog } from '@/components/recharges/edit-recharge-dialog'

export default function Recharges() {
  const { recharges, vehicles, drivers, removeRecharge } = useFuelStore()
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    date: string
    vehicleName: string
    liters: number
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingRecharge, setEditingRecharge] = useState<any | null>(null)

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await removeRecharge(deleteTarget.id)
    setIsDeleting(false)
    if (result.error) toast.error('Erro ao excluir abastecimento. Tente novamente.')
    else toast.success('Abastecimento excluído com sucesso')
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Histórico de Abastecimentos
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe as recargas e a eficiência de cada veículo.
          </p>
        </div>
        <RechargeFormDialog />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Odômetro</TableHead>
                  <TableHead>Eficiência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recharges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Nenhum abastecimento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  recharges.map((rec: any) => {
                    const vehicle = vehicles.find((v: any) => v.id === rec.vehicle)
                    const isOptimal = (rec.km_per_liter ?? 0) >= 10
                    return (
                      <TableRow
                        key={rec.id}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="font-medium text-slate-700">
                          {new Date(rec.recharge_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{vehicle?.plate}</div>
                          <div className="text-xs text-slate-500">{vehicle?.name}</div>
                        </TableCell>
                        <TableCell>
                          {rec.driver
                            ? (drivers.find((d: any) => d.id === rec.driver)?.name ?? '—')
                            : '—'}
                        </TableCell>
                        <TableCell>{rec.cost_center || '—'}</TableCell>
                        <TableCell>{rec.liters} L</TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(rec.cost)}
                        </TableCell>
                        <TableCell>{rec.odometer} km</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              isOptimal
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }
                          >
                            {rec.km_per_liter ?? 0} km/l
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-100"
                              onClick={() => setEditingRecharge(rec)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() =>
                                setDeleteTarget({
                                  id: rec.id,
                                  date: new Date(rec.recharge_date).toLocaleDateString('pt-BR'),
                                  vehicleName: vehicle?.name ?? 'N/A',
                                  liters: rec.liters,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Tem certeza que deseja excluir o seguinte abastecimento?</p>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data:</span>
                    <span className="font-medium text-slate-900">{deleteTarget?.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Veículo:</span>
                    <span className="font-medium text-slate-900">{deleteTarget?.vehicleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Litros:</span>
                    <span className="font-medium text-slate-900">{deleteTarget?.liters} L</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white focus:ring-red-500"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditRechargeDialog recharge={editingRecharge} onClose={() => setEditingRecharge(null)} />
    </div>
  )
}
