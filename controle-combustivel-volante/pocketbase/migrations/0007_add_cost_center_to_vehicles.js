migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vehicles')
    if (!col.fields.getByName('cost_center')) {
      col.fields.add(new TextField({ name: 'cost_center', required: false }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('vehicles')
    if (col.fields.getByName('cost_center')) {
      col.fields.removeByName('cost_center')
    }
    app.save(col)
  },
)
