onRecordUpdateRequest((e) => {
  // If not superuser or admin user, prevent setting status to Aprovado or Reprovado
  let isAdmin = false
  if (e.auth) {
    try {
      if (e.auth.getBool('admin') === true) {
        isAdmin = true
      }
    } catch (_) {}
  }

  const nextStatus = e.record.getString('status')
  const originalStatus = e.record.original() ? e.record.original().getString('status') : ''

  if (!isAdmin) {
    if (nextStatus === 'Aprovado' || nextStatus === 'Reprovado') {
      if (originalStatus !== nextStatus) {
        throw new ForbiddenError(
          'Apenas administradores podem aprovar ou reprovar solicitações de combustível.',
        )
      }
    }
  }

  // Validate rejection reason when status is Reprovado
  if (nextStatus === 'Reprovado') {
    const reason = (e.record.getString('rejection_reason') || '').trim()
    if (!reason) {
      throw new BadRequestError('A justificativa da reprovação é obrigatória.')
    }
  }

  return e.next()
}, 'fuel_requests')
