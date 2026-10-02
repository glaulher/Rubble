// Hook para impedir elevação de privilégios no campo admin da coleção de usuários
onRecordUpdateRequest((e) => {
  const isOriginalAdmin = e.record.original() ? e.record.original().getBool('admin') : false
  const isNextAdmin = e.record.getBool('admin')

  // Se houver tentativa de alterar a flag admin
  if (isOriginalAdmin !== isNextAdmin) {
    const isCallerAdmin = e.auth && e.auth.getBool('admin') === true
    if (!isCallerAdmin) {
      throw new ForbiddenError(
        'Apenas administradores podem alterar privilégios de administrador.',
      )
    }
  }

  return e.next()
}, 'users')

onRecordCreateRequest((e) => {
  if (e.record.getBool('admin') === true) {
    const isCallerAdmin = e.auth && e.auth.getBool('admin') === true
    if (!isCallerAdmin) {
      throw new ForbiddenError(
        'Apenas administradores podem cadastrar usuários com privilégios de administrador.',
      )
    }
  }

  return e.next()
}, 'users')
