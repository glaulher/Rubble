routerAdd(
  'POST',
  '/backend/v1/smtp-settings/test',
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

    const testRecipient = (body.to || body.recipient || body.email || '').trim()
    if (!testRecipient) {
      return e.badRequestError('O email de destino para o teste é obrigatório.')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testRecipient)) {
      return e.badRequestError('O email de destino informado não é válido.')
    }

    // Try reading SMTP config: from request body (preview test before saving) or from saved database
    let host = (body.host || '').trim()
    let port = parseInt(body.port, 10)
    let username = (body.username || '').trim()
    let password = body.password !== undefined && body.password !== null ? body.password : ''
    let senderAddress = (body.sender_address || body.senderAddress || '').trim()
    let senderName =
      (body.sender_name || body.senderName || '').trim() || 'Controle Combustível Volante'
    let tls = body.tls !== undefined ? Boolean(body.tls) : true
    let authMethod = (body.auth_method || body.authMethod || 'PLAIN').toUpperCase()

    // If host/sender not fully provided in test request, pull from saved smtp_settings record
    if (!host || !senderAddress) {
      try {
        const records = $app.findRecordsByFilter('smtp_settings', '', '-created', 1, 0)
        if (records && records.length > 0) {
          const savedRec = records[0]
          if (!host) host = savedRec.getString('host')
          if (isNaN(port) || port <= 0) port = savedRec.getInt('port') || 587
          if (!username && username !== '') username = savedRec.getString('username')
          if (!password) password = savedRec.getString('password')
          if (!senderAddress) senderAddress = savedRec.getString('sender_address')
          if (!body.sender_name && !body.senderName)
            senderName = savedRec.getString('sender_name') || senderName
          if (body.tls === undefined) tls = savedRec.getBool('tls')
          if (!body.auth_method && !body.authMethod)
            authMethod = savedRec.getString('auth_method') || 'PLAIN'
        }
      } catch (err) {
        console.warn('Erro ao consultar registro salvo de SMTP para teste:', err)
      }
    } else if (!password) {
      // If user is testing current form fields without re-typing existing saved password
      try {
        const records = $app.findRecordsByFilter('smtp_settings', '', '-created', 1, 0)
        if (records && records.length > 0) {
          password = records[0].getString('password')
        }
      } catch (_) {}
    }

    if (!host) {
      return e.badRequestError('Nenhum servidor host configurado para o teste de envio.')
    }
    if (isNaN(port) || port <= 0) {
      port = 587
    }
    if (!senderAddress) {
      return e.badRequestError('Nenhum email remetente configurado para o teste de envio.')
    }

    let mailClient
    try {
      mailClient = $mailer.newSmtpClient({
        host: host,
        port: port,
        username: username,
        password: password,
        tls: tls,
        authMethod: authMethod === 'LOGIN' ? 'LOGIN' : 'PLAIN',
      })
    } catch (err) {
      return e.badRequestError(
        'Erro ao inicializar cliente SMTP com os dados fornecidos: ' + err.message,
      )
    }

    const testSubject = 'Teste de Configuração de SMTP — Controle Combustível Volante'
    const nowStr = new Date().toLocaleString('pt-BR')
    const htmlBody =
      '<!DOCTYPE html>' +
      '<html><head><meta charset="UTF-8"><style>' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }' +
      '.card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }' +
      '.header { background: #059669; color: #ffffff; padding: 24px; text-align: center; }' +
      '.header h1 { margin: 0; font-size: 20px; font-weight: 600; }' +
      '.content { padding: 24px; }' +
      '.info-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }' +
      '.info-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }' +
      '.info-table td.label { font-weight: 600; color: #64748b; width: 35%; }' +
      '.info-table td.value { color: #0f172a; word-break: break-all; }' +
      '.footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0; }' +
      '</style></head><body>' +
      '<div class="card">' +
      '  <div class="header">' +
      '    <h1>✓ Teste de SMTP Realizado com Sucesso</h1>' +
      '  </div>' +
      '  <div class="content">' +
      '    <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.5;">Se você está lendo este email, a configuração de envio SMTP do sistema <strong>Controle Combustível Volante</strong> está funcionando corretamente!</p>' +
      '    <table class="info-table">' +
      '      <tr><td class="label">Host:</td><td class="value">' +
      host +
      '</td></tr>' +
      '      <tr><td class="label">Porta:</td><td class="value">' +
      port +
      '</td></tr>' +
      '      <tr><td class="label">Usuário:</td><td class="value">' +
      (username || '(nenhum)') +
      '</td></tr>' +
      '      <tr><td class="label">Remetente:</td><td class="value">' +
      senderName +
      ' &lt;' +
      senderAddress +
      '&gt;</td></tr>' +
      '      <tr><td class="label">TLS/SSL:</td><td class="value">' +
      (tls ? 'Ativado' : 'Desativado') +
      '</td></tr>' +
      '      <tr><td class="label">Data/Hora:</td><td class="value">' +
      nowStr +
      '</td></tr>' +
      '    </table>' +
      '  </div>' +
      '  <div class="footer">' +
      '    Email de verificação enviado a partir da tela de Configuração de SMTP.' +
      '  </div>' +
      '</div></body></html>'

    try {
      const message = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: testRecipient }],
        subject: testSubject,
        html: htmlBody,
      })

      mailClient.send(message)
      console.log('Email de teste de SMTP enviado com sucesso para:', testRecipient)

      // Audit test event
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('user', userId)
        auditRec.set('action', 'Testou envio de SMTP')
        auditRec.set('collection_name', 'smtp_settings')
        auditRec.set('record_id', host + ':' + port)
        auditRec.set(
          'details',
          JSON.stringify({
            recipient: testRecipient,
            host: host,
            port: port,
            sender: senderAddress,
            status: 'success',
          }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Email de teste enviado com sucesso para ' + testRecipient + '.',
      })
    } catch (err) {
      console.error('Falha no teste de envio SMTP para ' + testRecipient + ':', err)

      // Audit failure
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('user', userId)
        auditRec.set('action', 'Falha no teste de SMTP')
        auditRec.set('collection_name', 'smtp_settings')
        auditRec.set('record_id', host + ':' + port)
        auditRec.set(
          'details',
          JSON.stringify({
            recipient: testRecipient,
            host: host,
            port: port,
            error: err.message || String(err),
          }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.badRequestError('Falha ao enviar email de teste: ' + (err.message || String(err)))
    }
  },
  $apis.requireAuth(),
)
