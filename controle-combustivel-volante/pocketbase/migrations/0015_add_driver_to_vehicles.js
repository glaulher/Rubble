migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vehicles')
    const driversCol = app.findCollectionByNameOrId('drivers')
    if (!col.fields.getByName('driver')) {
      col.fields.add(
        new RelationField({
          name: 'driver',
          collectionId: driversCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('vehicles')
    if (col.fields.getByName('driver')) {
      col.fields.removeByName('driver')
    }
    app.save(col)
  },
)
