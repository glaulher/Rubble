routerAdd(
  'POST',
  '/backend/v1/smtp-settings',
  (e) => {
    const userId = e.auth && e.auth.id ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    if (!e.auth.getBool('admin')) {
      return e.forbiddenError('Acesso restrito para administradores')
    }

    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {}

    const host = (body.host || '').trim()
    const port = parseInt(body.port, 10)
    const username = (body.username || '').trim()
    const password = body.password !== undefined ? body.password : null
    const senderAddress = (body.sender_address || body.senderAddress || '').trim()
    const senderName =
      (body.sender_name || body.senderName || '').trim() || 'Controle Combustível Volante'
    const tls = body.tls !== undefined ? Boolean(body.tls) : true
    const authMethod = (body.auth_method || body.authMethod || 'PLAIN').toUpperCase()

    if (!host) {
      return e.badRequestError('O host do servidor SMTP é obrigatório.')
    }

    if (isNaN(port) || port <= 0 || port > 65535) {
      return e.badRequestError('A porta SMTP deve ser um número válido entre 1 e 65535.')
    }

    if (!senderAddress) {
      return e.badRequestError('O email do remetente é obrigatório.')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(senderAddress)) {
      return e.badRequestError('O email do remetente informado não é válido.')
    }

    let records = []
    try {
      records = $app.findRecordsByFilter('smtp_settings', '', '-created', 1, 0)
    } catch (err) {
      console.error('Erro ao buscar registro smtp_settings:', err)
    }

    let record
    let isNew = false
    if (records && records.length > 0) {
      record = records[0]
    } else {
      const col = $app.findCollectionByNameOrId('smtp_settings')
      record = new Record(col)
      isNew = true
    }

    record.set('host', host)
    record.set('port', port)
    record.set('username', username)
    // Only update password if explicitly passed as non-empty or non-null string
    if (password !== null && password !== undefined && password !== '') {
      record.set('password', password)
    }
    record.set('sender_address', senderAddress)
    record.set('sender_name', senderName)
    record.set('tls', tls)
    record.set('auth_method', authMethod === 'LOGIN' ? 'LOGIN' : 'PLAIN')

    try {
      $app.save(record)
    } catch (err) {
      console.error('Erro ao salvar smtp_settings:', err)
      return e.badRequestError('Falha ao salvar configurações de SMTP: ' + err.message)
    }

    // Record audit log
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('user', userId)
      auditRec.set('action', isNew ? 'Configurou SMTP' : 'Atualizou SMTP')
      auditRec.set('collection_name', 'smtp_settings')
      auditRec.set('record_id', record.id)
      auditRec.set(
        'details',
        JSON.stringify({
          host: host,
          port: port,
          username: username,
          sender_address: senderAddress,
          sender_name: senderName,
          tls: tls,
          auth_method: authMethod,
          password_updated: password !== null && password !== undefined && password !== '',
        }),
      )
      $app.save(auditRec)
    } catch (err) {
      console.error('Falha ao registrar log de auditoria para smtp_settings:', err)
    }

    const currentPwd = record.getString('password') || ''

    return e.json(200, {
      success: true,
      message: 'Configurações de SMTP salvas com sucesso.',
      data: {
        id: record.id,
        configured: true,
        host: record.getString('host'),
        port: record.getInt('port'),
        username: record.getString('username'),
        has_password: !!currentPwd,
        sender_address: record.getString('sender_address'),
        sender_name: record.getString('sender_name'),
        tls: record.getBool('tls'),
        auth_method: record.getString('auth_method'),
        updated: record.getString('updated') || record.getString('created'),
      },
    })
  },
  $apis.requireAuth(),
)
