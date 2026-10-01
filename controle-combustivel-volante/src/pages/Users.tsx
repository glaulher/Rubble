import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Shield,
  Users as UsersIcon,
  Pencil,
  Trash2,
  Download,
  KeyRound,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getUsers, updateUserAdmin, type UserRecord } from '@/services/users'
import { UserFormDialog } from '@/components/users/user-form-dialog'
import { EditUserDialog } from '@/components/users/edit-user-dialog'
import { DeleteUserDialog } from '@/components/users/delete-user-dialog'
import { ResetPasswordDialog } from '@/components/users/reset-password-dialog'
import { exportToCsv } from '@/lib/csv'
import { toast } from 'sonner'

export default function Users() {
  const { user: currentUser, viewMode } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null)
  const [userToResetPassword, setUserToResetPassword] = useState<UserRecord | null>(null)

  const isAdminView = viewMode === 'admin'

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])
  useRealtime('users', () => loadUsers())

  const handleToggleAdmin = async (u: UserRecord) => {
    setTogglingId(u.id)
    try {
      await updateUserAdmin(u.id, !u.admin)
      toast.success(
        u.admin ? 'Privilégio de administrador removido' : 'Usuário promovido a administrador',
      )
    } catch {
      toast.error('Erro ao atualizar privilégios')
    } finally {
      setTogglingId(null)
    }
  }

  const handleExport = () => {
    exportToCsv(
      `usuarios_export_${new Date().toISOString().split('T')[0]}.csv`,
      ['ID', 'Nome', 'Email', 'Administrador', 'Data de Criação'],
      users.map((u) => [
        u.id,
        u.name || '',
        u.email,
        u.admin ? 'Sim' : 'Não',
        new Date(u.created).toLocaleDateString('pt-BR'),
      ]),
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Carregando usuários...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciar Usuários</h1>
          <p className="text-sm text-slate-500">
            Visualize e gerencie privilégios dos usuários do sistema.
          </p>
        </div>
        {isAdminView && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <UserFormDialog />
          </div>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <TableRow key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            {u.admin ? (
                              <Shield className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                            ) : (
                              <UsersIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span>{u.name || '—'}</span>
                            {isSelf && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-slate-100 text-slate-600"
                              >
                                Você
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{u.email}</TableCell>
                        <TableCell>
                          {u.admin ? (
                            <Badge className="bg-indigo-100 text-indigo-700">Sim</Badge>
                          ) : (
                            <span className="text-slate-400 text-sm">Não</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(u.created).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-slate-400">
                              {togglingId === u.id ? '...' : u.admin ? 'Admin' : 'Usuário'}
                            </span>
                            <Switch
                              checked={u.admin}
                              disabled={isSelf || togglingId === u.id}
                              onCheckedChange={() => handleToggleAdmin(u)}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Redefinir Senha"
                              aria-label="Redefinir Senha"
                              onClick={() => setUserToResetPassword(u)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Editar Usuário"
                              aria-label="Editar Usuário"
                              onClick={() => setEditUser(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? 'Você não pode excluir sua própria conta'
                                  : 'Excluir Usuário'
                              }
                              aria-label="Excluir Usuário"
                              onClick={() => setUserToDelete(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
      <DeleteUserDialog
        user={userToDelete}
        onClose={() => {
          setUserToDelete(null)
          loadUsers()
        }}
      />
      <ResetPasswordDialog
        user={userToResetPassword}
        onClose={() => setUserToResetPassword(null)}
        onSuccess={() => loadUsers()}
      />
    </div>
  )
}
