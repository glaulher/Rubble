import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil } from 'lucide-react'
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
import useFuelStore from '@/stores/use-fuel-store'
import type { FieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

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

export function EditRechargeDialog({
  recharge,
  onClose,
}: {
  recharge: any | null
  onClose: () => void
}) {
  const { vehicles, drivers, editRecharge } = useFuelStore()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: '',
      driver: '',
      cost_center: '',
      recharge_date: '',
      liters: '',
      cost: '',
      odometer: '',
    },
  })

  useEffect(() => {
    if (recharge) {
      form.reset({
        vehicle: recharge.vehicle || '',
        driver: recharge.driver || '',
        cost_center: recharge.cost_center || '',
        recharge_date: recharge.recharge_date || '',
        liters: recharge.liters?.toString() || '',
        cost: recharge.cost?.toString() || '',
        odometer: recharge.odometer?.toString() || '',
      })
      setSubmitError(null)
      setFieldErrors({})
    }
  }, [recharge, form])

  function handleOpenChange(value: boolean) {
    if (!value) onClose()
  }

  async function onSubmit(values: FormValues) {
    if (!recharge) return
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
    const result = await editRecharge(recharge.id, data)
    setIsSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      toast.error('Erro ao atualizar abastecimento.')
      return
    }
    toast.success('Abastecimento atualizado com sucesso')
    onClose()
  }

  return (
    <Dialog open={!!recharge} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Editar Abastecimento
          </DialogTitle>
          <DialogDescription>Atualize os dados do abastecimento.</DialogDescription>
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
                      {vehicles.map((v: any) => (
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
                      <Input type="number" step="0.01" {...field} />
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
                      <Input type="number" step="0.01" {...field} />
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
                      <Input type="number" {...field} />
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
                Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
