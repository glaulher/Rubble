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
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/hooks/use-auth'
import { updateUser, type UserRecord } from '@/services/users'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  admin: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export function EditUserDialog({
  user,
  onClose,
}: {
  user: UserRecord | null
  onClose: () => void
}) {
  const { user: currentUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', admin: false },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        admin: !!user.admin,
      })
    }
  }, [user, form])

  const isSelf = user?.id === currentUser?.id

  async function onSubmit(values: FormValues) {
    if (!user) return
    setIsSubmitting(true)
    try {
      await updateUser(user.id, {
        name: values.name,
        email: values.email,
        admin: values.admin,
      })
      toast.success('Usuário atualizado com sucesso')
      onClose()
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      const emailError = fieldErrors.email
      if (emailError && emailError.toLowerCase().includes('unique')) {
        form.setError('email', { message: 'Email já cadastrado' })
      } else if (emailError) {
        form.setError('email', { message: emailError })
      } else {
        toast.error('Erro ao atualizar usuário')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Editar Usuário
          </DialogTitle>
          <DialogDescription>Atualize os dados do usuário.</DialogDescription>
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
              name="admin"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Administrador</FormLabel>
                      <p className="text-xs text-slate-500">
                        {isSelf
                          ? 'Você não pode alterar seu próprio privilégio.'
                          : 'Conceder privilégios de administrador ao usuário.'}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSelf}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
