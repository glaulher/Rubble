migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fuel_requests')
    col.fields.removeByName('status')
    col.fields.add(
      new SelectField({
        name: 'status',
        values: ['Aberto', 'Em Andamento', 'Concluído', 'Aprovado', 'Reprovado'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('fuel_requests')
    col.fields.removeByName('status')
    col.fields.add(
      new SelectField({
        name: 'status',
        values: ['Aberto', 'Em Andamento', 'Concluído'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
)
