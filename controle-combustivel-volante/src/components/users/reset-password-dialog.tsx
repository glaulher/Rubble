import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { resetUserPassword, type UserRecord } from '@/services/users'
import { toast } from 'sonner'

const formSchema = z
  .object({
    password: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres'),
    passwordConfirm: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirm'],
  })

type FormValues = z.infer<typeof formSchema>

interface ResetPasswordDialogProps {
  user: UserRecord | null
  onClose: () => void
  onSuccess?: () => void
}

export function ResetPasswordDialog({ user, onClose, onSuccess }: ResetPasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      passwordConfirm: '',
    },
  })

  const handleClose = () => {
    if (isSubmitting) return
    form.reset()
    setShowPassword(false)
    setShowConfirmPassword(false)
    onClose()
  }

  async function onSubmit(values: FormValues) {
    if (!user) return
    setIsSubmitting(true)
    try {
      await resetUserPassword(user.id, {
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      })
      toast.success(`Senha de ${user.name || user.email} redefinida com sucesso!`)
      form.reset()
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string }
      const msg =
        errorObj?.data?.message ||
        errorObj?.message ||
        'Erro ao redefinir a senha do usuário. Tente novamente.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <KeyRound className="h-5 w-5 text-amber-500" />
            Redefinir Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <strong>{user?.name || user?.email}</strong> (
            <span className="text-slate-500">{user?.email}</span>).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
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
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md bg-amber-50 p-3 border border-amber-200/60 text-xs text-amber-800 space-y-1">
              <p className="font-medium">Importante:</p>
              <p>
                A senha será sobrescrita e o usuário precisará utilizar a nova senha no próximo
                login. A alteração será registrada no log de auditoria do sistema.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Nova Senha
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
