migrate(
  (app) => {
    // 1. Hardening das regras de usuários (_pb_users_auth_)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    // Apenas admins podem criar usuários diretamente pela API (SSO cria via $app.save)
    usersCol.createRule = '@request.auth.admin = true'
    // Usuários podem editar seus próprios dados, exceto a flag de admin
    usersCol.updateRule = '@request.auth.admin = true || (id = @request.auth.id && @request.body.admin:isset = false)'
    // Apenas admin pode excluir usuários
    usersCol.deleteRule = '@request.auth.admin = true'
    app.save(usersCol)

    // 2. Hardening das regras de coleções com relacionamento de usuário
    const authOwnerRule = "@request.auth.id != '' && (@request.auth.admin = true || user = @request.auth.id)"
    const collections = ['vehicles', 'recharges', 'maintenance_intervals', 'drivers']

    for (let i = 0; i < collections.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(collections[i])
        col.listRule = authOwnerRule
        col.viewRule = authOwnerRule
        col.createRule = authOwnerRule
        col.updateRule = authOwnerRule
        col.deleteRule = authOwnerRule
        app.save(col)
      } catch (_) {}
    }

    // 3. Hardening específico de solicitações de combustível (fuel_requests)
    try {
      const frCol = app.findCollectionByNameOrId('fuel_requests')
      frCol.listRule = authOwnerRule
      frCol.viewRule = authOwnerRule
      frCol.deleteRule = authOwnerRule
      frCol.createRule =
        "@request.auth.id != '' && (@request.auth.admin = true || (user = @request.auth.id && (@request.body.status:isset = false || @request.body.status = 'Aberto')))"
      frCol.updateRule =
        "@request.auth.id != '' && (@request.auth.admin = true || (user = @request.auth.id && status != 'Aprovado' && status != 'Reprovado' && (@request.body.status:isset = false || (@request.body.status != 'Aprovado' && @request.body.status != 'Reprovado'))))"
      app.save(frCol)
    } catch (_) {}
  },
  (app) => {
    // Revert para regras anteriores se necessário
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.createRule = ''
      usersCol.updateRule = '@request.auth.admin = true || id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
