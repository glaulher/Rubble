routerAdd(
  'POST',
  '/backend/v1/users/{id}/reset-password',
  (e) => {
    const adminId = e.auth && e.auth.id ? e.auth.id : ''
    if (!adminId) return e.unauthorizedError('auth required')

    if (!e.auth.getBool('admin')) {
      return e.forbiddenError('Acesso restrito a administradores')
    }

    const targetId = e.request.pathValue('id')
    if (!targetId) {
      return e.badRequestError('ID do usuário é obrigatório')
    }

    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {}

    const newPassword = body.password || ''
    const passwordConfirm = body.passwordConfirm || ''

    if (!newPassword || typeof newPassword !== 'string') {
      return e.badRequestError('A nova senha é obrigatória')
    }

    if (newPassword.length < 8) {
      return e.badRequestError('A nova senha deve ter no mínimo 8 caracteres')
    }

    if (newPassword !== passwordConfirm) {
      return e.badRequestError('As senhas não coincidem')
    }

    let targetUser
    try {
      targetUser = $app.findRecordById('users', targetId)
    } catch (_) {
      return e.notFoundError('Usuário não encontrado')
    }

    const targetName = targetUser.getString('name')
    const targetEmail = targetUser.getString('email')
    const adminEmail = e.auth.getString('email')
    const adminName = e.auth.getString('name')

    try {
      targetUser.setPassword(newPassword)
      $app.save(targetUser)
    } catch (saveErr) {
      console.error('Erro ao atualizar senha no banco:', saveErr)
      return e.badRequestError('Falha ao redefinir senha: ' + (saveErr.message || 'erro interno'))
    }

    // Gravação no log de auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('user', adminId)
      auditRec.set('action', 'reset_password')
      auditRec.set('collection_name', 'users')
      auditRec.set('record_id', targetId)
      auditRec.set(
        'details',
        JSON.stringify({
          targetUserId: targetId,
          targetUserName: targetName,
          targetUserEmail: targetEmail,
          resetByAdminId: adminId,
          resetByAdminEmail: adminEmail,
          resetByAdminName: adminName,
        }),
      )
      $app.save(auditRec)
    } catch (auditErr) {
      console.error('Erro ao gravar audit_log na redefinição de senha:', auditErr)
    }

    return e.json(200, { success: true, message: 'Senha redefinida com sucesso' })
  },
  $apis.requireAuth(),
)
