import pb from '@/lib/pocketbase/client'

export type AuditLog = {
  id: string
  user: string
  action: string
  collection_name: string
  record_id: string
  details: string | Record<string, unknown> | null
  created: string
  updated: string
  expand?: { user?: { id: string; name: string; email: string } | null }
}

export const getAuditLogs = (params: { page?: number; perPage?: number; filter?: string }) => {
  const { page = 1, perPage = 15, filter = '' } = params
  return pb.collection('audit_logs').getList(page, perPage, {
    sort: '-created',
    filter: filter || undefined,
    expand: 'user',
  })
}
