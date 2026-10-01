import { useState, useCallback, useEffect, Fragment } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { getAuditLogs, type AuditLog } from '@/services/audit-logs'
import { toast } from 'sonner'

const ACTIONS = ['create', 'update', 'delete', 'reset_password'] as const
const COLLECTIONS = [
  'vehicles',
  'fuel_requests',
  'recharges',
  'maintenance_intervals',
  'drivers',
  'users',
] as const
const ACTION_LABELS: Record<string, string> = {
  create: 'Criar',
  update: 'Atualizar',
  delete: 'Excluir',
  edit_user: 'Editar Usuário',
  delete_user: 'Excluir Usuário',
  reset_password: 'Redefinir Senha',
}
const COLLECTION_LABELS: Record<string, string> = {
  vehicles: 'Veículos',
  fuel_requests: 'Solicitações',
  recharges: 'Abastecimentos',
  maintenance_intervals: 'Manutenção',
  drivers: 'Motoristas',
  users: 'Usuários',
  smtp_settings: 'Config. SMTP',
}
const ACTION_BADGE: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  edit_user: 'bg-blue-100 text-blue-700',
  delete_user: 'bg-red-100 text-red-700',
  reset_password: 'bg-purple-100 text-purple-700',
}

function parseDetails(details: unknown): Record<string, unknown> | null {
  if (!details) return null
  if (typeof details === 'string') {
    try {
      return JSON.parse(details)
    } catch {
      return null
    }
  }
  if (typeof details === 'object') return details as Record<string, unknown>
  return null
}

function buildFilter(action: string, collection: string, from: string, to: string): string {
  const parts: string[] = []
  if (action) parts.push(`action = "${action}"`)
  if (collection) parts.push(`collection_name = "${collection}"`)
  if (from) parts.push(`created >= "${from} 00:00:00"`)
  if (to) parts.push(`created <= "${to} 23:59:59"`)
  return parts.join(' && ')
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [action, setAction] = useState('')
  const [collection, setCollection] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const loadLogs = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const filter = buildFilter(action, collection, fromDate, toDate)
        const res = await getAuditLogs({ page: p, filter })
        setLogs(res.items as unknown as AuditLog[])
        setTotalPages(res.totalPages)
        setPage(p)
      } catch {
        toast.error('Erro ao carregar logs de auditoria')
      } finally {
        setLoading(false)
      }
    },
    [action, collection, fromDate, toDate],
  )

  useEffect(() => {
    loadLogs(1)
  }, [loadLogs])
  useRealtime('audit_logs', () => loadLogs(page))

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Auditoria</h1>
        <p className="text-sm text-slate-500">Registro de todas as alterações no sistema.</p>
      </div>

      <Card className="border-none shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Ação</label>
            <Select value={action || 'all'} onValueChange={(v) => setAction(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Coleção</label>
            <Select
              value={collection || 'all'}
              onValueChange={(v) => setCollection(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {COLLECTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {COLLECTION_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">De</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Até</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAction('')
              setCollection('')
              setFromDate('')
              setToDate('')
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Coleção</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expanded.has(log.id)
                    const details = parseDetails(log.details)
                    return (
                      <Fragment key={log.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                          onClick={() => toggleExpand(log.id)}
                        >
                          <TableCell className="w-8">
                            {details &&
                              (isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              ))}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            {new Date(log.created).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium text-slate-700">
                              {log.expand?.user?.name || log.expand?.user?.email || '—'}
                            </div>
                            {log.expand?.user?.email && log.expand?.user?.name && (
                              <div className="text-xs text-slate-500">{log.expand.user.email}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={ACTION_BADGE[log.action] || 'bg-slate-100 text-slate-700'}
                            >
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {COLLECTION_LABELS[log.collection_name] || log.collection_name}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">
                            {log.record_id}
                          </TableCell>
                        </TableRow>
                        {isExpanded && details && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50/50 py-3">
                              <pre className="text-xs bg-white border border-slate-100 rounded p-3 overflow-auto max-h-60">
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => loadLogs(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => loadLogs(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
