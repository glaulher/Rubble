import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import useFuelStore from '@/stores/use-fuel-store'
import type { FieldErrors } from '@/lib/pocketbase/errors'

const formSchema = z.object({
  vehicle: z.string().min(1, 'Selecione um veículo'),
  driver: z.string().optional(),
  cost_center: z.string().optional(),
  recharge_date: z.string().min(1, 'Data é obrigatória'),
  liters: z.string().min(1, 'Litros é obrigatório'),
  cost: z.string().min(1, 'Custo é obrigatório'),
  odometer: z.string().min(1, 'Odômetro é obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

export function RechargeFormDialog() {
  const { vehicles, drivers, addRecharge } = useFuelStore()
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: '',
      driver: '',
      cost_center: '',
      recharge_date: new Date().toISOString().split('T')[0],
      liters: '',
      cost: '',
      odometer: '',
    },
  })

  function handleVehicleChange(vehicleId: string) {
    form.setValue('vehicle', vehicleId)
    const selectedVeh = vehicles.find((v: any) => v.id === vehicleId)
    if (selectedVeh) {
      if (selectedVeh.driver) {
        form.setValue('driver', selectedVeh.driver)
      }
      if (selectedVeh.cost_center && !form.getValues('cost_center')) {
        form.setValue('cost_center', selectedVeh.cost_center)
      }
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      setSubmitError(null)
      setFieldErrors({})
      form.reset()
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    const data: Record<string, unknown> = {
      vehicle: values.vehicle,
      recharge_date: values.recharge_date,
      liters: Number(values.liters),
      cost: Number(values.cost),
      odometer: Number(values.odometer),
    }
    if (values.driver) data.driver = values.driver
    if (values.cost_center) data.cost_center = values.cost_center
    const result = await addRecharge(data)
    setIsSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      return
    }
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Novo Abastecimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Abastecimento</DialogTitle>
          <DialogDescription>Registre um novo abastecimento no sistema.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select onValueChange={handleVehicleChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.vehicle && (
                    <p className="text-sm text-red-500">{fieldErrors.vehicle}</p>
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
                  <FormLabel>Motorista</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
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
              name="cost_center"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Custo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Administração" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recharge_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Litros</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odômetro</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
