routerAdd(
  'POST',
  '/backend/v1/fuel-requests/{id}/reject',
  (e) => {
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    if (e.auth.getString('role') !== 'gerente') {
      return e.forbiddenError('Apenas usuários com perfil Gerente podem reprovar solicitações.')
    }

    const id = e.request.pathValue('id')
    let record
    try {
      record = $app.findRecordById('fuel_requests', id)
    } catch (_) {
      return e.notFoundError('Solicitação não encontrada')
    }

    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {}

    const rejectionReason = (body.rejection_reason || body.reason || '').trim()
    if (!rejectionReason) {
      return e.badRequestError('A justificativa da reprovação é obrigatória.')
    }

    var oldStatus = record.getString('status')
    record.set('status', 'Reprovado')
    record.set('rejection_reason', rejectionReason)
    $app.save(record)

    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var auditRec = new Record(auditCol)
      auditRec.set('user', userId)
      auditRec.set('action', 'Reprovou solicitação')
      auditRec.set('collection_name', 'fuel_requests')
      auditRec.set('record_id', id)
      auditRec.set(
        'details',
        JSON.stringify({
          from: oldStatus,
          to: 'Reprovado',
          rejection_reason: rejectionReason,
        }),
      )
      $app.save(auditRec)
    } catch (err) {
      console.error('audit log reject error:', err)
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
