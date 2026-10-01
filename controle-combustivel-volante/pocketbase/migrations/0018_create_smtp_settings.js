migrate(
  (app) => {
    // 1. Create smtp_settings collection (internal settings collection, locked to superusers / hooks only)
    var smtpSettings = new Collection({
      name: 'smtp_settings',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'host', type: 'text', required: true },
        { name: 'port', type: 'number', required: true, onlyInt: true },
        { name: 'username', type: 'text' },
        { name: 'password', type: 'text' }, // stored on backend, never exposed plain to client
        { name: 'sender_address', type: 'text', required: true },
        { name: 'sender_name', type: 'text' },
        { name: 'tls', type: 'bool' },
        { name: 'auth_method', type: 'select', values: ['PLAIN', 'LOGIN'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(smtpSettings)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('smtp_settings'))
    } catch (_) {}
  },
)
