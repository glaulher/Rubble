routerAdd(
  'POST',
  '/backend/v1/fuel-requests/{id}/approve',
  (e) => {
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    if (e.auth.getString('role') !== 'gerente') {
      return e.forbiddenError('Apenas usuários com perfil Gerente podem aprovar solicitações.')
    }

    const id = e.request.pathValue('id')
    let record
    try {
      record = $app.findRecordById('fuel_requests', id)
    } catch (_) {
      return e.notFoundError('Solicitação não encontrada')
    }

    var oldStatus = record.getString('status')
    record.set('status', 'Aprovado')
    $app.save(record)

    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var auditRec = new Record(auditCol)
      auditRec.set('user', userId)
      auditRec.set('action', 'Aprovou solicitação')
      auditRec.set('collection_name', 'fuel_requests')
      auditRec.set('record_id', id)
      auditRec.set('details', JSON.stringify({ from: oldStatus, to: 'Aprovado' }))
      $app.save(auditRec)
    } catch (err) {
      console.error('audit log approve error:', err)
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
