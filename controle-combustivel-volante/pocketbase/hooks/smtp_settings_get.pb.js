routerAdd(
  'GET',
  '/backend/v1/smtp-settings',
  (e) => {
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    if (!e.auth.getBool('admin')) {
      return e.forbiddenError('Acesso restrito para administradores')
    }

    let records = []
    try {
      records = $app.findRecordsByFilter('smtp_settings', '', '-created', 1, 0)
    } catch (err) {
      console.error('Erro ao buscar smtp_settings:', err)
    }

    if (!records || records.length === 0) {
      return e.json(200, {
        configured: false,
        host: '',
        port: 587,
        username: '',
        has_password: false,
        sender_address: '',
        sender_name: 'Controle Combustível Volante',
        tls: true,
        auth_method: 'PLAIN',
      })
    }

    const rec = records[0]
    const pwd = rec.getString('password') || ''

    return e.json(200, {
      id: rec.id,
      configured: true,
      host: rec.getString('host') || '',
      port: rec.getInt('port') || 587,
      username: rec.getString('username') || '',
      has_password: !!pwd,
      sender_address: rec.getString('sender_address') || '',
      sender_name: rec.getString('sender_name') || '',
      tls: rec.getBool('tls'),
      auth_method: rec.getString('auth_method') || 'PLAIN',
      updated: rec.getString('updated') || rec.getString('created') || '',
    })
  },
  $apis.requireAuth(),
)
