import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UserPlus } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createUser } from '@/services/users'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

const formSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
    passwordConfirm: z.string().min(1, 'Confirmação de senha é obrigatória'),
    admin: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirm'],
  })

type FormValues = z.infer<typeof formSchema>

export function UserFormDialog() {
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirm: '',
      admin: false,
    },
  })

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      setSubmitError(null)
      form.clearErrors()
      form.reset()
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    form.clearErrors()
    setIsSubmitting(true)
    try {
      await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
        admin: values.admin,
      })
      toast.success('Usuário criado com sucesso')
      setOpen(false)
      form.reset()
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      const emailError = fieldErrors.email
      if (emailError && emailError.toLowerCase().includes('unique')) {
        form.setError('email', { message: 'Email já cadastrado' })
      } else if (emailError) {
        form.setError('email', { message: emailError })
      } else {
        const errorKeys = Object.keys(fieldErrors)
        if (errorKeys.length > 0) {
          errorKeys.forEach((key) => {
            form.setError(key as keyof FormValues, { message: fieldErrors[key] })
          })
        } else {
          setSubmitError('Erro ao criar usuário. Tente novamente.')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Criar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Usuário</DialogTitle>
          <DialogDescription>Cadastre um novo membro da equipe no sistema.</DialogDescription>
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
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="admin"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Administrador</FormLabel>
                      <p className="text-xs text-slate-500">
                        Conceder privilégios de administrador ao usuário.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
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
                Criar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
