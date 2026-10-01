import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import useFuelStore, { type MaintenanceInterval } from '@/stores/use-fuel-store'
import { Autocomplete } from '@/components/ui/autocomplete'
import { useCostCenterSuggestions } from '@/hooks/use-cost-center-suggestions'
import { toast } from 'sonner'

const formSchema = z.object({
  vehicle: z.string().min(1, 'Selecione um veículo'),
  task_name: z.string().min(3, 'Nome da tarefa é obrigatório'),
  interval_km: z.number().min(1, 'Intervalo deve ser maior que 0'),
  last_maintenance_km: z.number().min(0, 'Valor inválido'),
  last_maintenance_date: z.string().optional(),
  cost_center: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function MaintenanceFormDialog({
  open,
  onOpenChange,
  interval,
  currentKm,
  presetVehicleId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  interval?: MaintenanceInterval | null
  currentKm?: number
  presetVehicleId?: string
}) {
  const { vehicles, addMaintenanceInterval, updateMaintenanceInterval } = useFuelStore()
  const costCenterSuggestions = useCostCenterSuggestions()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: '',
      task_name: '',
      interval_km: 10000,
      last_maintenance_km: 0,
      last_maintenance_date: new Date().toISOString().split('T')[0],
      cost_center: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (interval) {
        form.reset({
          vehicle: interval.vehicle,
          task_name: interval.task_name,
          interval_km: interval.interval_km,
          last_maintenance_km: currentKm ?? interval.last_maintenance_km,
          last_maintenance_date: new Date().toISOString().split('T')[0],
          cost_center: interval.cost_center || '',
        })
      } else {
        form.reset({
          vehicle: presetVehicleId ?? '',
          task_name: '',
          interval_km: 10000,
          last_maintenance_km: currentKm ?? 0,
          last_maintenance_date: new Date().toISOString().split('T')[0],
          cost_center: '',
        })
      }
    }
  }, [open, interval, currentKm, presetVehicleId, form])

  async function onSubmit(values: FormValues) {
    const data: Record<string, unknown> = {
      vehicle: values.vehicle,
      task_name: values.task_name,
      interval_km: values.interval_km,
      last_maintenance_km: values.last_maintenance_km,
    }
    if (values.last_maintenance_date) data.last_maintenance_date = values.last_maintenance_date
    if (values.cost_center) data.cost_center = values.cost_center

    const result = interval
      ? await updateMaintenanceInterval(interval.id, data)
      : await addMaintenanceInterval(data)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(interval ? 'Manutenção registrada com sucesso' : 'Intervalo de manutenção criado')
    onOpenChange(false)
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {interval ? 'Registrar Manutenção' : 'Novo Intervalo de Manutenção'}
          </DialogTitle>
          <DialogDescription>
            {interval
              ? 'Atualize os dados de manutenção do veículo.'
              : 'Cadastre um novo intervalo de manutenção.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="task_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarefa de Manutenção</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Troca de Óleo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="interval_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo (KM)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_maintenance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Km da Última Manutenção</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="last_maintenance_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Última Manutenção</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                  <Autocomplete
                    value={field.value || ''}
                    onChange={field.onChange}
                    suggestions={costCenterSuggestions}
                    placeholder="Ex: Administração"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {interval ? 'Registrar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
