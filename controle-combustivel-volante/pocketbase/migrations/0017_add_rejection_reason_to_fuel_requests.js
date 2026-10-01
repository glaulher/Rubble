migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fuel_requests')
    if (!col.fields.getByName('rejection_reason')) {
      col.fields.add(
        new TextField({
          name: 'rejection_reason',
          required: false,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('fuel_requests')
      if (col.fields.getByName('rejection_reason')) {
        col.fields.removeByName('rejection_reason')
        app.save(col)
      }
    } catch (_) {}
  },
)
