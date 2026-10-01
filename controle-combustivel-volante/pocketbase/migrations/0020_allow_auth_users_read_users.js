migrate(
  (app) => {
    // Permite que qualquer usuário autenticado liste e veja usuários (para selecionar vínculo em motoristas etc.)
    // ou admin
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const rule = "@request.auth.id != ''"
    usersCol.listRule = rule
    usersCol.viewRule = rule
    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const adminUserRule = '@request.auth.admin = true || id = @request.auth.id'
      usersCol.listRule = adminUserRule
      usersCol.viewRule = adminUserRule
      app.save(usersCol)
    } catch (_) {}
  },
)
