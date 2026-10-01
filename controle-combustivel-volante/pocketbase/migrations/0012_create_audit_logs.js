migrate(
  (app) => {
    var auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: '@request.auth.admin = true',
      viewRule: '@request.auth.admin = true',
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'collection_name', type: 'text', required: true },
        { name: 'record_id', type: 'text', required: true },
        { name: 'details', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_logs_collection_name ON audit_logs (collection_name)',
        'CREATE INDEX idx_audit_logs_action ON audit_logs (action)',
        'CREATE INDEX idx_audit_logs_created ON audit_logs (created)',
      ],
    })
    app.save(auditLogs)

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var adminUserRule = '@request.auth.admin = true || id = @request.auth.id'
    usersCol.listRule = adminUserRule
    usersCol.viewRule = adminUserRule
    usersCol.updateRule = adminUserRule
    app.save(usersCol)
  },
  (app) => {
    try {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      usersCol.updateRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}

    try {
      app.delete(app.findCollectionByNameOrId('audit_logs'))
    } catch (_) {}
  },
)
