migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fuel_requests')
    // Apenas admins podem atualizar solicitações se o status for alterado para Aprovado/Reprovado,
    // ou se o status original já for Aprovado/Reprovado.
    // Usuários comuns (proprietários) só podem criar/atualizar solicitações nos status de fluxo regular (Aberto, Em Andamento, Concluído).
    col.createRule =
      "@request.auth.admin = true || (user = @request.auth.id && @request.body.status:isset = false) || (user = @request.auth.id && (@request.body.status = 'Aberto' || @request.body.status = 'Em Andamento' || @request.body.status = 'Concluído'))"
    col.updateRule =
      "@request.auth.admin = true || (user = @request.auth.id && status != 'Aprovado' && status != 'Reprovado' && (@request.body.status:isset = false || (@request.body.status != 'Aprovado' && @request.body.status != 'Reprovado')))"
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('fuel_requests')
      const adminRule = '@request.auth.admin = true || user = @request.auth.id'
      col.createRule = adminRule
      col.updateRule = adminRule
      app.save(col)
    } catch (_) {}
  },
)
