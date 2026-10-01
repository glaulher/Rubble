migrate(
  (app) => {
    var adminUserId = null
    try {
      var existingUser = app.findFirstRecordByFilter('_pb_users_auth_', 'admin = true')
      if (existingUser) {
        adminUserId = existingUser.id
      }
    } catch (_) {}

    if (!adminUserId) {
      try {
        var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
        var adminRec = new Record(usersCol)
        adminRec.setEmail('admin@rubble.local')
        adminRec.setPassword($security.randomString(32))
        adminRec.setVerified(true)
        adminRec.set('name', 'Administrador Rubble')
        app.save(adminRec)
        adminUserId = adminRec.id
      } catch (_) {}
    }

    try {
      app.findCollectionByNameOrId('drivers')
    } catch (_) {
      app.save(
        new Collection({
          name: 'drivers',
          type: 'base',
          listRule: "@request.auth.id != '' && user = @request.auth.id",
          viewRule: "@request.auth.id != '' && user = @request.auth.id",
          createRule: "@request.auth.id != '' && user = @request.auth.id",
          updateRule: "@request.auth.id != '' && user = @request.auth.id",
          deleteRule: "@request.auth.id != '' && user = @request.auth.id",
          fields: [
            { name: 'name', type: 'text', required: true },
            {
              name: 'user',
              type: 'relation',
              required: true,
              collectionId: '_pb_users_auth_',
              maxSelect: 1,
              cascadeDelete: true,
            },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        }),
      )
    }
    var driversColId = app.findCollectionByNameOrId('drivers').id

    function addUserField(col) {
      if (!col.fields.getByName('user')) {
        col.fields.add(
          new RelationField({
            name: 'user',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
            cascadeDelete: true,
          }),
        )
      }
      col.listRule = "@request.auth.id != '' && user = @request.auth.id"
      col.viewRule = "@request.auth.id != '' && user = @request.auth.id"
      col.createRule = "@request.auth.id != '' && user = @request.auth.id"
      col.updateRule = "@request.auth.id != '' && user = @request.auth.id"
      col.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
      app.save(col)
      app
        .db()
        .newQuery('UPDATE ' + col.name + " SET user = {:uid} WHERE user IS NULL OR user = ''")
        .bind({ uid: adminUserId })
        .execute()
    }

    var vehiclesCol = app.findCollectionByNameOrId('vehicles')
    addUserField(vehiclesCol)

    var frCol = app.findCollectionByNameOrId('fuel_requests')
    if (!frCol.fields.getByName('user')) {
      frCol.fields.add(
        new RelationField({
          name: 'user',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: true,
        }),
      )
    }
    var frDriver = frCol.fields.getByName('driver')
    if (frDriver) {
      try {
        if (frDriver.type !== 'relation') {
          frCol.fields.removeByName('driver')
          frDriver = null
        }
      } catch (_) {
        frCol.fields.removeByName('driver')
        frDriver = null
      }
    }
    if (!frDriver) {
      frCol.fields.add(
        new RelationField({ name: 'driver', collectionId: driversColId, maxSelect: 1 }),
      )
    }
    frCol.listRule = "@request.auth.id != '' && user = @request.auth.id"
    frCol.viewRule = "@request.auth.id != '' && user = @request.auth.id"
    frCol.createRule = "@request.auth.id != '' && user = @request.auth.id"
    frCol.updateRule = "@request.auth.id != '' && user = @request.auth.id"
    frCol.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(frCol)
    app
      .db()
      .newQuery("UPDATE fuel_requests SET user = {:uid} WHERE user IS NULL OR user = ''")
      .bind({ uid: adminUserId })
      .execute()

    var recCol = app.findCollectionByNameOrId('recharges')
    if (!recCol.fields.getByName('user')) {
      recCol.fields.add(
        new RelationField({
          name: 'user',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: true,
        }),
      )
    }
    var recDriver = recCol.fields.getByName('driver')
    if (recDriver) {
      try {
        if (recDriver.type !== 'relation') {
          recCol.fields.removeByName('driver')
          recDriver = null
        }
      } catch (_) {
        recCol.fields.removeByName('driver')
        recDriver = null
      }
    }
    if (!recDriver) {
      recCol.fields.add(
        new RelationField({ name: 'driver', collectionId: driversColId, maxSelect: 1 }),
      )
    }
    recCol.listRule = "@request.auth.id != '' && user = @request.auth.id"
    recCol.viewRule = "@request.auth.id != '' && user = @request.auth.id"
    recCol.createRule = "@request.auth.id != '' && user = @request.auth.id"
    recCol.updateRule = "@request.auth.id != '' && user = @request.auth.id"
    recCol.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(recCol)
    app
      .db()
      .newQuery("UPDATE recharges SET user = {:uid} WHERE user IS NULL OR user = ''")
      .bind({ uid: adminUserId })
      .execute()

    var miCol = app.findCollectionByNameOrId('maintenance_intervals')
    addUserField(miCol)

    var driverNames = ['João Silva', 'Carlos Souza', 'Maria Oliveira']
    var dCol = app.findCollectionByNameOrId('drivers')
    for (var i = 0; i < driverNames.length; i++) {
      try {
        app.findFirstRecordByData('drivers', 'name', driverNames[i])
      } catch (_) {
        var rec = new Record(dCol)
        rec.set('name', driverNames[i])
        rec.set('user', adminUserId)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('drivers'))
    } catch (_) {}
  },
)
