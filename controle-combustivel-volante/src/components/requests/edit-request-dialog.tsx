import { useState, useRef, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, X, Loader2, Pencil } from 'lucide-react'
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
import useFuelStore, { type FuelRequest } from '@/stores/use-fuel-store'
import { useAuth } from '@/hooks/use-auth'
import type { FieldErrors } from '@/lib/pocketbase/errors'
import { getPhotoUrl } from '@/services/fuel-requests'
import { toast } from 'sonner'

const formSchema = z
  .object({
    vehicle: z.string().min(1, 'Selecione um veículo'),
    driver: z.string().optional(),
    request_date: z.string().min(1, 'Data é obrigatória'),
    destination: z.string().min(3, 'Destino muito curto'),
    cost_center: z.string().optional(),
    status: z.string().min(1, 'Status é obrigatório'),
    rejection_reason: z.string().optional(),
    current_odometer: z.string().optional(),
    last_refuel_odometer: z.string().optional(),
    last_refuel_date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'Reprovado') {
        return !!data.rejection_reason && data.rejection_reason.trim().length > 0
      }
      return true
    },
    {
      message: 'A justificativa é obrigatória para reprovar a solicitação',
      path: ['rejection_reason'],
    },
  )

type FormValues = z.infer<typeof formSchema>

export function EditRequestDialog({
  request,
  onClose,
}: {
  request: FuelRequest | null
  onClose: () => void
}) {
  const { vehicles, drivers, editFuelRequest } = useFuelStore()
  const { isAdmin } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: '',
      driver: '',
      request_date: '',
      destination: '',
      status: 'Aberto',
      cost_center: '',
      current_odometer: '',
      last_refuel_odometer: '',
      last_refuel_date: '',
    },
  })

  useEffect(() => {
    if (request) {
      form.reset({
        vehicle: request.vehicle,
        driver: request.driver,
        request_date: request.request_date,
        destination: request.destination,
        status: request.status,
        rejection_reason: request.rejection_reason || '',
        cost_center: request.cost_center || '',
        current_odometer: request.current_odometer?.toString() || '',
        last_refuel_odometer: request.last_refuel_odometer?.toString() || '',
        last_refuel_date: request.last_refuel_date || '',
      })
      if (request.photo) {
        setPhotoPreview(getPhotoUrl({ id: request.id, photo: request.photo }))
      } else {
        setPhotoPreview(null)
      }
      setPhotoFile(null)
      setSubmitError(null)
      setFieldErrors({})
    }
  }, [request, form])

  useEffect(() => {
    return () => {
      if (photoFile && photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoFile, photoPreview])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoFile && photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    if (photoFile && photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    if (request?.photo) {
      setPhotoPreview(getPhotoUrl({ id: request.id, photo: request.photo }))
    } else {
      setPhotoPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleVehicleChange(vehicleId: string) {
    form.setValue('vehicle', vehicleId)
    const selectedVeh = vehicles.find((v) => v.id === vehicleId)
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
    if (!value) onClose()
  }

  async function onSubmit(values: FormValues) {
    if (!request) return
    setSubmitError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    const data: Record<string, unknown> = {
      vehicle: values.vehicle,
      driver: values.driver,
      request_date: values.request_date,
      destination: values.destination,
      status: values.status,
    }
    if (values.driver) data.driver = values.driver
    if (values.current_odometer) data.current_odometer = Number(values.current_odometer)
    if (values.last_refuel_odometer) data.last_refuel_odometer = Number(values.last_refuel_odometer)
    if (values.last_refuel_date) data.last_refuel_date = values.last_refuel_date
    if (values.cost_center) data.cost_center = values.cost_center
    if (photoFile) data.photo = photoFile
    if (values.status === 'Reprovado') {
      data.rejection_reason = values.rejection_reason?.trim()
    } else if (values.rejection_reason !== undefined) {
      data.rejection_reason = values.rejection_reason
    }

    const result = await editFuelRequest(request.id, data)
    setIsSubmitting(false)

    if (result.error) {
      setSubmitError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      toast.error('Erro ao atualizar solicitação.')
      return
    }

    toast.success('Solicitação atualizada com sucesso')
    onClose()
  }

  return (
    <Dialog open={!!request} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar Solicitação
          </DialogTitle>
          <DialogDescription>Atualize os dados da solicitação de abastecimento.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                        {vehicles.map((v) => (
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
                        {drivers.map((d) => (
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="request_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Prevista</FormLabel>
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
                    <FormControl>
                      <Input placeholder="Ex: Administração" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Viagem para inspeção na filial..." {...field} />
                  </FormControl>
                  {fieldErrors.destination && (
                    <p className="text-sm text-red-500">{fieldErrors.destination}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Aberto">Aberto</SelectItem>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      {isAdmin && (
                        <>
                          <SelectItem value="Aprovado">Aprovado</SelectItem>
                          <SelectItem value="Reprovado">Reprovado</SelectItem>
                        </>
                      )}
                      {!isAdmin && (field.value === 'Aprovado' || field.value === 'Reprovado') && (
                        <SelectItem value={field.value} disabled>
                          {field.value}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('status') === 'Reprovado' && (
              <FormField
                control={form.control}
                name="rejection_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-red-700 font-semibold">
                      Motivo / Justificativa da Reprovação *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Informe obrigatoriamente a justificativa da reprovação..."
                        className="border-red-300 focus-visible:ring-red-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Km Atual</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 12350" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_refuel_odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Km Último Abastecimento</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 11900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="last_refuel_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Último Abastecimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Foto</FormLabel>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {photoPreview ? 'Trocar Foto' : 'Carregar Foto'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <div className="flex items-center gap-2">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-12 w-12 rounded object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={clearPhoto}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
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
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
