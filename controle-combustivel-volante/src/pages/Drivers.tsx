import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Plus, Loader2, Trash2, AlertTriangle, Pencil, Mail, ShieldCheck } from 'lucide-react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import useFuelStore, { type Driver } from '@/stores/use-fuel-store'
import { getUsers, type UserRecord } from '@/services/users'
import { useAuth } from '@/hooks/use-auth'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  user: z.string().optional(),
})

export default function Drivers() {
  const { drivers, fuelRequests, recharges, addDriver, editDriver, removeDriver } = useFuelStore()
  const { user: currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [usersList, setUsersList] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', user: 'none' },
  })

  const loadUsersList = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const data = await getUsers()
      setUsersList(data)
    } catch (err) {
      console.warn('Erro ao carregar lista de usuários:', err)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    loadUsersList()
  }, [loadUsersList])

  function handleOpenCreate() {
    setEditing(null)
    // Sugere vincular ao usuário logado ou nenhum
    const defaultUser = currentUser?.id ? currentUser.id : 'none'
    form.reset({ name: '', user: defaultUser })
    setOpen(true)
    loadUsersList()
  }

  function handleEdit(d: Driver) {
    setEditing(d)
    form.reset({
      name: d.name,
      user: d.user || 'none',
    })
    setOpen(true)
    loadUsersList()
  }

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsSubmitting(true)
    const payload = {
      name: values.name,
      user: values.user && values.user !== 'none' ? values.user : null,
    }
    const result = editing ? await editDriver(editing.id, payload) : await addDriver(payload)
    setIsSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(editing ? 'Motorista atualizado' : 'Motorista cadastrado')
    setOpen(false)
    form.reset()
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await removeDriver(deleteTarget.id)
    setIsDeleting(false)
    if (result.error) {
      toast.error('Erro ao excluir motorista')
      return
    }
    toast.success('Motorista excluído')
    setDeleteTarget(null)
  }

  const getStats = (driverId: string) => ({
    requests: fuelRequests.filter((r) => r.driver === driverId).length,
    recharges: recharges.filter((r) => r.driver === driverId).length,
  })

  // Obtém informações completas do usuário vinculado (nome e email)
  const getLinkedUserInfo = (d: Driver) => {
    if (d.expand?.user) {
      return {
        name: d.expand.user.name,
        email: d.expand.user.email,
      }
    }
    if (d.user) {
      const found = usersList.find((u) => u.id === d.user)
      if (found) {
        return {
          name: found.name,
          email: found.email,
        }
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Motoristas</h1>
          <p className="text-sm text-slate-500">Gerencie os motoristas cadastrados no sistema.</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) {
              setEditing(null)
              form.reset()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 text-white shadow-sm"
              onClick={handleOpenCreate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Atualize os dados e a conta de usuário vinculada ao motorista.'
                  : 'Cadastre um novo motorista e vincule à sua conta de usuário.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Motorista *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário Vinculado (Conta do Sistema)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'none'}
                        disabled={loadingUsers}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um usuário para vincular..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-slate-500">Nenhum usuário vinculado</span>
                          </SelectItem>
                          {usersList.map((u) => {
                            const displayName = u.name ? `${u.name} (${u.email})` : u.email
                            return (
                              <SelectItem key={u.id} value={u.id}>
                                <div className="flex items-center gap-2">
                                  <span>{displayName}</span>
                                  {u.admin && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-slate-500">
                        Selecione a conta de acesso. Você pode identificar tanto pelo nome quanto
                        pelo email.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editing ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {drivers.length === 0 ? (
          <Card className="col-span-full border-none shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <User className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500">Nenhum motorista cadastrado.</p>
            </CardContent>
          </Card>
        ) : (
          drivers.map((d) => {
            const stats = getStats(d.id)
            const linkedUser = getLinkedUserInfo(d)

            return (
              <Card
                key={d.id}
                className="border-none shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="bg-slate-100 p-2 rounded-full flex-shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{d.name}</h3>
                        {linkedUser ? (
                          <div className="mt-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate font-medium">
                                {linkedUser.name ? linkedUser.name : 'Conta vinculada'}
                              </span>
                            </div>
                            {linkedUser.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{linkedUser.email}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5 italic">
                            Nenhum usuário vinculado
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-100"
                        onClick={() => handleEdit(d)}
                        title="Editar motorista"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => setDeleteTarget(d)}
                        title="Excluir motorista"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>{stats.requests} solicitação(ões)</span>
                    <span>{stats.recharges} abastecimento(s)</span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o motorista <strong>{deleteTarget?.name}</strong>? Esta
              ação não pode ser desfeita.
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
