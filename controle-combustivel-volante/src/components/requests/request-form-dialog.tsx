import { useState, useRef, useEffect } from 'react'
import { z } from 'zod'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Upload, X, Loader2 } from 'lucide-react'
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
  request_date: z.string().min(1, 'Data é obrigatória'),
  destination: z.string().min(3, 'Destino muito curto'),
  cost_center: z.string().optional(),
  current_odometer: z.string().optional(),
  last_refuel_odometer: z.string().optional(),
  last_refuel_date: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

function TextField({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  errors,
}: {
  control: Control<FormValues>
  name: keyof FormValues
  label: string
  placeholder?: string
  type?: string
  errors: FieldErrors
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          {errors[name] && <p className="text-sm text-red-500">{errors[name]}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function RequestFormDialog() {
  const { vehicles, drivers, addFuelRequest } = useFuelStore()
  const [open, setOpen] = useState(false)
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
      request_date: new Date().toISOString().split('T')[0],
      destination: '',
      cost_center: '',
      current_odometer: '',
      last_refuel_odometer: '',
      last_refuel_date: '',
    },
  })

  // When a vehicle is selected, auto-fill responsible driver and cost center if available
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

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      setSubmitError(null)
      setFieldErrors({})
      form.reset()
      clearPhoto()
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    const data: Record<string, unknown> = {
      vehicle: values.vehicle,
      driver: values.driver,
      request_date: values.request_date,
      destination: values.destination,
    }
    if (values.driver) data.driver = values.driver
    if (values.current_odometer) data.current_odometer = Number(values.current_odometer)
    if (values.last_refuel_odometer) data.last_refuel_odometer = Number(values.last_refuel_odometer)
    if (values.last_refuel_date) data.last_refuel_date = values.last_refuel_date
    if (values.cost_center) data.cost_center = values.cost_center
    if (photoFile) data.photo = photoFile
    const result = await addFuelRequest(data)
    setIsSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      return
    }
    setOpen(false)
    form.reset()
    clearPhoto()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
          <DialogDescription>
            Preencha os dados para solicitar um novo abastecimento.
          </DialogDescription>
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
              <TextField
                control={form.control}
                name="request_date"
                label="Data Prevista"
                type="date"
                errors={fieldErrors}
              />
              <TextField
                control={form.control}
                name="cost_center"
                label="Centro de Custo"
                placeholder="Ex: Administração"
                errors={fieldErrors}
              />
            </div>
            <TextField
              control={form.control}
              name="destination"
              label="Destino"
              placeholder="Ex: Viagem para inspeção na filial..."
              errors={fieldErrors}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                control={form.control}
                name="current_odometer"
                label="Km Atual"
                type="number"
                placeholder="Ex: 12350"
                errors={fieldErrors}
              />
              <TextField
                control={form.control}
                name="last_refuel_odometer"
                label="Km Último Abastecimento"
                type="number"
                placeholder="Ex: 11900"
                errors={fieldErrors}
              />
            </div>
            <TextField
              control={form.control}
              name="last_refuel_date"
              label="Data Último Abastecimento"
              type="date"
              errors={fieldErrors}
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
                  Carregar Foto
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
                    <span className="text-sm text-slate-500 max-w-[120px] truncate">
                      {photoFile?.name}
                    </span>
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
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
