migrate(
  (app) => {
    // 1. Adiciona campo 'role' na coleção de usuários (_pb_users_auth_) se não existir
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(new TextField({ name: 'role', required: false }))
      app.save(usersCol)
    }

    // 2. Compartilhamento de dados da frota entre todos os usuários autenticados
    // Permite que qualquer usuário autenticado liste e visualize veículos, abastecimentos,
    // intervalos de manutenção e motoristas
    const collections = ['vehicles', 'recharges', 'maintenance_intervals', 'drivers']
    for (let i = 0; i < collections.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(collections[i])
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule =
          "@request.auth.id != '' && (@request.auth.admin = true || @request.auth.role = 'gerente' || user = @request.auth.id)"
        col.deleteRule =
          "@request.auth.id != '' && (@request.auth.admin = true || @request.auth.role = 'gerente' || user = @request.auth.id)"
        app.save(col)
      } catch (_) {}
    }

    // 3. Solicitações de combustível (fuel_requests)
    try {
      const frCol = app.findCollectionByNameOrId('fuel_requests')
      // Todos os usuários autenticados podem ver todas as solicitações da frota em tempo real
      frCol.listRule = "@request.auth.id != ''"
      frCol.viewRule = "@request.auth.id != ''"
      frCol.deleteRule =
        "@request.auth.id != '' && (@request.auth.admin = true || @request.auth.role = 'gerente' || user = @request.auth.id)"
      // Qualquer usuário autenticado pode criar solicitação no status inicial 'Aberto'
      frCol.createRule =
        "@request.auth.id != '' && (@request.auth.admin = true || @request.auth.role = 'gerente' || (user = @request.auth.id && (@request.body.status:isset = false || @request.body.status = 'Aberto')))"
      // Apenas gerente pode atualizar status para Aprovado/Reprovado. Usuários comuns só atualizam suas próprias se não finalizadas.
      frCol.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'gerente' || (user = @request.auth.id && status != 'Aprovado' && status != 'Reprovado' && (@request.body.status:isset = false || (@request.body.status != 'Aprovado' && @request.body.status != 'Reprovado'))))"
      app.save(frCol)
    } catch (_) {}
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('role')) {
        usersCol.fields.removeByName('role')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
