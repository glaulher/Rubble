migrate(
  (app) => {
    try {
      var record = app.findFirstRecordByFilter('_pb_users_auth_', "email = 'admin@rubble.local'")
      if (record && !record.getBool('admin')) {
        record.set('admin', true)
        app.save(record)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      var record = app.findFirstRecordByFilter('_pb_users_auth_', "email = 'admin@rubble.local'")
      if (record) {
        record.set('admin', false)
        app.save(record)
      }
    } catch (_) {}
  },
)
