migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('admin')) {
      usersCol.fields.add(new BoolField({ name: 'admin' }))
    }
    app.save(usersCol)

    var adminRule = '@request.auth.admin = true || user = @request.auth.id'

    var collections = ['vehicles', 'fuel_requests', 'recharges', 'maintenance_intervals', 'drivers']
    for (var i = 0; i < collections.length; i++) {
      var col = app.findCollectionByNameOrId(collections[i])
      col.listRule = adminRule
      col.viewRule = adminRule
      col.createRule = adminRule
      col.updateRule = adminRule
      col.deleteRule = adminRule
      app.save(col)
    }
  },
  (app) => {
    var collections = ['vehicles', 'fuel_requests', 'recharges', 'maintenance_intervals', 'drivers']
    var oldRule = "@request.auth.id != '' && user = @request.auth.id"
    for (var i = 0; i < collections.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(collections[i])
        col.listRule = oldRule
        col.viewRule = oldRule
        col.createRule = oldRule
        col.updateRule = oldRule
        col.deleteRule = oldRule
        app.save(col)
      } catch (_) {}
    }

    try {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('admin')) {
        usersCol.fields.removeByName('admin')
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
