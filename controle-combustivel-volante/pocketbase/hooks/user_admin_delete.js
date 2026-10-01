routerAdd(
  'DELETE',
  '/backend/v1/users/{id}',
  (e) => {
    const adminId = e.auth && e.auth.id ? e.auth.id : ''
    if (!adminId) return e.unauthorizedError('auth required')

    if (!e.auth.getBool('admin')) {
      return e.forbiddenError('admin access required')
    }

    const targetId = e.request.pathValue('id')
    if (!targetId) {
      return e.badRequestError('ID do usuário é obrigatório')
    }

    if (targetId === adminId) {
      return e.badRequestError('Não é possível excluir o próprio usuário autenticado')
    }

    let targetUser
    try {
      targetUser = $app.findRecordById('users', targetId)
    } catch (_) {
      return e.notFoundError('Usuário não encontrado')
    }

    const userName = targetUser.getString('name')
    const userEmail = targetUser.getString('email')
    const userIsAdmin = targetUser.getBool('admin')

    // Executa a limpeza de vínculos e a exclusão dentro de uma transação
    try {
      $app.runInTransaction((txApp) => {
        // 1. Audit logs: desvincular o user (definir como vazio) para manter o histórico de auditoria intacto
        txApp
          .db()
          .newQuery('UPDATE audit_logs SET user = NULL WHERE user = {:uid}')
          .bind({ uid: targetId })
          .execute()

        // 2. Desvincular de vehicles caso estejam vinculados
        txApp
          .db()
          .newQuery('UPDATE vehicles SET user = NULL WHERE user = {:uid}')
          .bind({ uid: targetId })
          .execute()

        // 3. Desvincular de fuel_requests
        txApp
          .db()
          .newQuery('UPDATE fuel_requests SET user = NULL WHERE user = {:uid}')
          .bind({ uid: targetId })
          .execute()

        // 4. Desvincular de recharges
        txApp
          .db()
          .newQuery('UPDATE recharges SET user = NULL WHERE user = {:uid}')
          .bind({ uid: targetId })
          .execute()

        // 5. Desvincular de maintenance_intervals
        txApp
          .db()
          .newQuery('UPDATE maintenance_intervals SET user = NULL WHERE user = {:uid}')
          .bind({ uid: targetId })
          .execute()

        // 6. Desvincular de drivers
        txApp
          .db()
          .newQuery('UPDATE drivers SET user = NULL WHERE user = {:uid}')
          .bind({ uid: targetId })
          .execute()

        // 7. Excluir o registro do usuário
        txApp.delete(targetUser)

        // 8. Criar registro de auditoria da exclusão feito pelo admin
        try {
          const auditCol = txApp.findCollectionByNameOrId('audit_logs')
          const auditRec = new Record(auditCol)
          auditRec.set('user', adminId)
          auditRec.set('action', 'delete_user')
          auditRec.set('collection_name', 'users')
          auditRec.set('record_id', targetId)
          auditRec.set(
            'details',
            JSON.stringify({
              name: userName,
              email: userEmail,
              admin: userIsAdmin,
              deletedBy: adminId,
            }),
          )
          txApp.save(auditRec)
        } catch (auditErr) {
          console.error('Erro ao gravar audit_log na exclusão de usuário:', auditErr)
        }
      })
    } catch (err) {
      console.error('Erro ao excluir usuário:', err)
      return e.badRequestError('Falha ao excluir usuário: ' + (err.message || 'erro interno'))
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
