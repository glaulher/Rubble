migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fuel_requests')

    if (!col.fields.getByName('current_odometer')) {
      col.fields.add(new NumberField({ name: 'current_odometer' }))
    }
    if (!col.fields.getByName('last_refuel_odometer')) {
      col.fields.add(new NumberField({ name: 'last_refuel_odometer' }))
    }
    if (!col.fields.getByName('last_refuel_date')) {
      col.fields.add(new DateField({ name: 'last_refuel_date' }))
    }
    if (!col.fields.getByName('photo')) {
      col.fields.add(
        new FileField({
          name: 'photo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('fuel_requests')
    col.fields.removeByName('current_odometer')
    col.fields.removeByName('last_refuel_odometer')
    col.fields.removeByName('last_refuel_date')
    col.fields.removeByName('photo')
    app.save(col)
  },
)
