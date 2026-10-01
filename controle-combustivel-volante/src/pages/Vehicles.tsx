import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Car,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Pencil,
  User,
  LayoutGrid,
  Table as TableIcon,
  Info,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InlineCostCenterEdit } from '@/components/vehicles/inline-cost-center-edit'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import useFuelStore, { type Vehicle } from '@/stores/use-fuel-store'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

const vehicleFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  plate: z.string().min(1, 'Placa é obrigatória'),
  driver: z.string().optional(),
  cost_center: z.string().optional(),
})

type VehicleFormValues = z.infer<typeof vehicleFormSchema>

export default function Vehicles() {
  const { vehicles, drivers, recharges, fuelRequests, addVehicle, editVehicle, removeVehicle } =
    useFuelStore()
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [driverFilter, setDriverFilter] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    plate: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFieldErrors, setEditFieldErrors] = useState<FieldErrors>({})

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: { name: '', plate: '', driver: '', cost_center: '' },
  })

  const editForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: { name: '', plate: '', driver: '', cost_center: '' },
  })

  const getLatestOdometer = (vehicleId: string) => {
    const vehicleRecharges = recharges
      .filter((r) => r.vehicle === vehicleId)
      .sort((a, b) => new Date(b.recharge_date).getTime() - new Date(a.recharge_date).getTime())
    return vehicleRecharges[0]?.odometer ?? 0
  }

  const getDriverName = (v: Vehicle) => {
    if (v.driver) {
      const found = drivers.find((d) => d.id === v.driver)
      if (found) return found.name
    }
    if (v.expand?.driver?.name) return v.expand.driver.name
    return null
  }

  const vehicleStats = vehicles.map((v) => {
    const vRecharges = recharges.filter((r) => r.vehicle === v.id)
    const vRequests = fuelRequests.filter((r) => r.vehicle === v.id)
    const totalLiters = vRecharges.reduce((acc, r) => acc + r.liters, 0)
    const totalCost = vRecharges.reduce((acc, r) => acc + r.cost, 0)
    return {
      ...v,
      driverName: getDriverName(v),
      latestOdometer: getLatestOdometer(v.id),
      totalLiters,
      totalCost,
      relatedRecharges: vRecharges.length,
      relatedRequests: vRequests.length,
    }
  })

  const filteredVehicles = vehicleStats.filter((v) => {
    if (driverFilter === 'all') return true
    if (driverFilter === 'none') return !v.driver
    return v.driver === driverFilter
  })

  async function onSubmit(values: VehicleFormValues) {
    setSubmitError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    const payload: { name: string; plate: string; driver?: string; cost_center?: string } = {
      name: values.name,
      plate: values.plate,
      cost_center: values.cost_center,
    }
    if (values.driver && values.driver !== 'none') {
      payload.driver = values.driver
    }
    const result = await addVehicle(payload)
    setIsSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      return
    }
    toast.success('Veículo cadastrado com sucesso')
    setOpen(false)
    form.reset()
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      setSubmitError(null)
      setFieldErrors({})
      form.reset()
    }
  }

  function handleEditOpen(value: boolean) {
    setEditOpen(value)
    if (!value) {
      setEditError(null)
      setEditFieldErrors({})
      setEditTarget(null)
      editForm.reset()
    }
  }

  function openEdit(v: Vehicle) {
    setEditTarget(v)
    editForm.reset({
      name: v.name,
      plate: v.plate,
      driver: v.driver || 'none',
      cost_center: v.cost_center || '',
    })
    setEditOpen(true)
  }

  async function onEditSubmit(values: VehicleFormValues) {
    if (!editTarget) return
    setEditError(null)
    setEditFieldErrors({})
    setEditSubmitting(true)
    const payload: { name: string; plate: string; driver?: string; cost_center?: string } = {
      name: values.name,
      plate: values.plate,
      driver: values.driver && values.driver !== 'none' ? values.driver : '',
      cost_center: values.cost_center,
    }
    const result = await editVehicle(editTarget.id, payload)
    setEditSubmitting(false)
    if (result.error) {
      setEditError(result.error)
      setEditFieldErrors(result.fieldErrors ?? {})
      return
    }
    setEditOpen(false)
    setEditTarget(null)
    editForm.reset()
    toast.success('Veículo atualizado com sucesso')
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await removeVehicle(deleteTarget.id)
    setIsDeleting(false)
    if (result.error) {
      toast.error('Erro ao excluir veículo. Tente novamente.')
    } else {
      toast.success('Veículo e registros relacionados excluídos com sucesso')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Frota de Veículos</h1>
          <p className="text-sm text-slate-500">
            Visualize e gerencie os veículos registrados no sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[200px] h-9 bg-white">
                <div className="flex items-center gap-2 truncate">
                  <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Filtrar responsável..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                <SelectItem value="none">Sem responsável vinculado</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {driverFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDriverFilter('all')}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800"
              >
                Limpar
              </Button>
            )}
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <Button
              type="button"
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode('cards')}
              title="Visualização em cards"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Cards
            </Button>
            <Button
              type="button"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode('table')}
              title="Visualização em tabela"
            >
              <TableIcon className="h-4 w-4 mr-1.5" />
              Tabela
            </Button>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Veículo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Registrar Novo Veículo</DialogTitle>
                <DialogDescription>
                  Preencha os dados do veículo para adicioná-lo à frota.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Fiat Toro" {...field} />
                        </FormControl>
                        {fieldErrors.name && (
                          <p className="text-sm text-red-500">{fieldErrors.name}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: ABC-1234" {...field} />
                        </FormControl>
                        {fieldErrors.plate && (
                          <p className="text-sm text-red-500">{fieldErrors.plate}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="driver"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável (Motorista)</FormLabel>
                        {drivers.length === 0 ? (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              Nenhum motorista cadastrado no sistema
                            </div>
                            <p className="text-amber-700">
                              Cadastre um motorista primeiro na página de{' '}
                              <Link
                                to="/motoristas"
                                className="underline font-semibold hover:text-amber-900"
                                onClick={() => handleOpenChange(false)}
                              >
                                Motoristas
                              </Link>{' '}
                              para poder vinculá-lo como responsável por este veículo.
                            </p>
                          </div>
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o motorista responsável..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum responsável vinculado</SelectItem>
                              {drivers.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {fieldErrors.driver && (
                          <p className="text-sm text-red-500">{fieldErrors.driver}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost_center"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Custo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Administração" {...field} />
                        </FormControl>
                        {fieldErrors.cost_center && (
                          <p className="text-sm text-red-500">{fieldErrors.cost_center}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {submitError && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-md p-3">
                      {submitError}
                    </p>
                  )}
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Veículo
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Car className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum veículo cadastrado na frota.</p>
            <p className="text-xs text-slate-400 mt-1">
              Clique em &quot;Novo Veículo&quot; para adicionar o primeiro veículo.
            </p>
          </CardContent>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-700 font-medium">
              Nenhum veículo encontrado para este filtro.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Nenhum veículo vinculado ao responsável selecionado.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setDriverFilter('all')}
            >
              Mostrar todos os veículos
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((v) => (
            <Card
              key={v.id}
              className="border-none shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{v.name}</CardTitle>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {v.plate}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-50"
                    onClick={() => openEdit(v)}
                    title="Editar veículo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteTarget({ id: v.id, name: v.name, plate: v.plate })}
                    title="Excluir veículo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    Responsável:
                  </span>
                  {v.driverName ? (
                    <span className="font-medium text-slate-800 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                      {v.driverName}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Não definido</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Centro de Custo:</span>
                  <InlineCostCenterEdit vehicleId={v.id} value={v.cost_center || ''} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Odômetro:</span>
                  <span className="font-medium text-slate-900">
                    {v.latestOdometer.toLocaleString('pt-BR')} km
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Total Abastecido:</span>
                  <span className="font-medium text-slate-700">{v.totalLiters.toFixed(1)} L</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Total Gasto:</span>
                  <span className="font-medium text-slate-700">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(v.totalCost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-md border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead className="text-right">Odômetro</TableHead>
                    <TableHead className="text-right">Abastecido</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((v) => (
                    <TableRow key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-medium text-slate-900">{v.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {v.plate}
                        </span>
                      </TableCell>
                      <TableCell>
                        {v.driverName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="bg-blue-100 text-blue-700 p-1 rounded-full">
                              <User className="h-3 w-3" />
                            </div>
                            <span className="font-medium text-slate-800 text-sm">
                              {v.driverName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Não definido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <InlineCostCenterEdit vehicleId={v.id} value={v.cost_center || ''} />
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {v.latestOdometer.toLocaleString('pt-BR')} km
                      </TableCell>
                      <TableCell className="text-right text-slate-700">
                        {v.totalLiters.toFixed(1)} L
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(v.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-100"
                            onClick={() => openEdit(v)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() =>
                              setDeleteTarget({ id: v.id, name: v.name, plate: v.plate })
                            }
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={handleEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
            <DialogDescription>Atualize os dados do veículo conforme necessário.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Fiat Toro" {...field} />
                    </FormControl>
                    {editFieldErrors.name && (
                      <p className="text-sm text-red-500">{editFieldErrors.name}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: ABC-1234" {...field} />
                    </FormControl>
                    {editFieldErrors.plate && (
                      <p className="text-sm text-red-500">{editFieldErrors.plate}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="driver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável (Motorista)</FormLabel>
                    {drivers.length === 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          Nenhum motorista cadastrado no sistema
                        </div>
                        <p className="text-amber-700">
                          Cadastre um motorista primeiro na página de{' '}
                          <Link
                            to="/motoristas"
                            className="underline font-semibold hover:text-amber-900"
                            onClick={() => handleEditOpen(false)}
                          >
                            Motoristas
                          </Link>{' '}
                          para poder vinculá-lo como responsável.
                        </p>
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motorista responsável..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum responsável vinculado</SelectItem>
                          {drivers.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {editFieldErrors.driver && (
                      <p className="text-sm text-red-500">{editFieldErrors.driver}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="cost_center"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Administração" {...field} />
                    </FormControl>
                    {editFieldErrors.cost_center && (
                      <p className="text-sm text-red-500">{editFieldErrors.cost_center}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-md p-3">
                  {editError}
                </p>
              )}
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => handleEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Tem certeza que deseja excluir o veículo{' '}
                  <strong className="text-slate-900">{deleteTarget?.name}</strong> (Placa:{' '}
                  <strong className="text-slate-900">{deleteTarget?.plate}</strong>)?
                </p>
                {deleteTarget &&
                  vehicleStats.find((v) => v.id === deleteTarget.id) &&
                  (vehicleStats.find((v) => v.id === deleteTarget.id)!.relatedRecharges > 0 ||
                    vehicleStats.find((v) => v.id === deleteTarget.id)!.relatedRequests > 0) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                      <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        Registros relacionados serão excluídos:
                      </p>
                      <p className="text-sm text-amber-700">
                        {vehicleStats.find((v) => v.id === deleteTarget.id)!.relatedRecharges}{' '}
                        abastecimento(s) e{' '}
                        {vehicleStats.find((v) => v.id === deleteTarget.id)!.relatedRequests}{' '}
                        solicitação(ões) de combustível.
                      </p>
                    </div>
                  )}
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
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
