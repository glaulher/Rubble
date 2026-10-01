onRecordAfterUpdateSuccess((e) => {
  const currentStatus = e.record.getString('status')
  const originalStatus = e.record.original() ? e.record.original().getString('status') : ''

  // Only trigger when status changed to Aprovado or Reprovado
  if (currentStatus !== 'Aprovado' && currentStatus !== 'Reprovado') {
    return e.next()
  }

  if (currentStatus === originalStatus) {
    return e.next()
  }

  // Fetch details about the fuel request
  let vehicleInfo = 'Não informado'
  let vehiclePlate = ''
  try {
    const vehicleId = e.record.getString('vehicle')
    if (vehicleId) {
      const vRec = $app.findRecordById('vehicles', vehicleId)
      vehicleInfo = vRec.getString('name')
      vehiclePlate = vRec.getString('plate')
    }
  } catch (err) {
    console.warn('Erro ao buscar dados do veículo para notificação de status:', err)
  }

  let driverName = 'Não informado'
  let driverUserId = ''
  try {
    const driverId = e.record.getString('driver')
    if (driverId) {
      const dRec = $app.findRecordById('drivers', driverId)
      driverName = dRec.getString('name')
      driverUserId = dRec.getString('user')
    }
  } catch (err) {
    console.warn('Erro ao buscar motorista para notificação de status:', err)
  }

  // Creator of the request
  let creatorId = e.record.getString('user')
  let recipientEmails = []

  // Try finding email of driver's linked user
  if (driverUserId) {
    try {
      const dUserRec = $app.findRecordById('users', driverUserId)
      const dEmail = dUserRec.getString('email')
      if (dEmail && recipientEmails.indexOf(dEmail) === -1) {
        recipientEmails.push(dEmail)
      }
    } catch (_) {}
  }

  // Try finding email of request creator
  if (creatorId) {
    try {
      const uRec = $app.findRecordById('users', creatorId)
      const uEmail = uRec.getString('email')
      if (uEmail && recipientEmails.indexOf(uEmail) === -1) {
        recipientEmails.push(uEmail)
      }
    } catch (_) {}
  }

  if (recipientEmails.length === 0) {
    console.log(
      'Nenhum destinatário de email encontrado para notificação de status da solicitação:',
      e.record.id,
    )
    return e.next()
  }

  let rawDate = e.record.getString('request_date') || ''
  let formattedDate = rawDate
  if (rawDate) {
    try {
      const d = new Date(rawDate)
      formattedDate = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    } catch (_) {
      formattedDate = rawDate.split('T')[0]
    }
  }

  const destination = e.record.getString('destination') || 'Não informado'
  const costCenter = e.record.getString('cost_center') || 'Não informado'
  const rejectionReason = e.record.getString('rejection_reason') || ''

  const isApproved = currentStatus === 'Aprovado'
  const statusColor = isApproved ? '#059669' : '#dc2626'
  const headerBg = isApproved ? '#059669' : '#dc2626'
  const statusBadgeBg = isApproved ? '#d1fae5' : '#fee2e2'
  const statusBadgeText = isApproved ? '#065f46' : '#991b1b'

  const siteUrl = $os.getenv('SITE_URL') || $os.getenv('PB_INSTANCE_URL') || ''
  const requestsLink = siteUrl ? siteUrl + '/requests' : ''

  const subject =
    'Solicitação de Combustível ' +
    currentStatus +
    ': ' +
    vehicleInfo +
    (vehiclePlate ? ' (' + vehiclePlate + ')' : '')

  const htmlBody =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }' +
    '.card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }' +
    '.header { background: ' +
    headerBg +
    '; color: #ffffff; padding: 24px; text-align: center; }' +
    '.header h1 { margin: 0; font-size: 20px; font-weight: 600; }' +
    '.header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }' +
    '.content { padding: 24px; }' +
    '.status-box { text-align: center; margin-bottom: 20px; padding: 12px; background: ' +
    statusBadgeBg +
    '; color: ' +
    statusBadgeText +
    '; border-radius: 6px; font-weight: 700; font-size: 16px; }' +
    '.reason-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 14px; margin-top: 16px; margin-bottom: 16px; color: #881337; }' +
    '.reason-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }' +
    '.reason-text { font-size: 14px; margin: 0; line-height: 1.4; }' +
    '.info-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }' +
    '.info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }' +
    '.info-table td.label { font-weight: 600; color: #64748b; width: 38%; }' +
    '.info-table td.value { color: #0f172a; }' +
    '.btn-container { text-align: center; margin-top: 24px; }' +
    '.btn { display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; }' +
    '.footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0; }' +
    '</style></head><body>' +
    '<div class="card">' +
    '  <div class="header">' +
    '    <h1>Solicitação de Combustível ' +
    currentStatus +
    '</h1>' +
    '    <p>Controle Combustível Volante</p>' +
    '  </div>' +
    '  <div class="content">' +
    '    <div class="status-box">Status atual: ' +
    currentStatus.toUpperCase() +
    '</div>' +
    '    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">Sua solicitação de abastecimento foi analisada e seu status foi alterado para <strong>' +
    currentStatus +
    '</strong>.</p>' +
    (rejectionReason && !isApproved
      ? '    <div class="reason-box">' +
        '      <div class="reason-title">Justificativa da Reprovação:</div>' +
        '      <div class="reason-text">' +
        rejectionReason +
        '</div>' +
        '    </div>'
      : '') +
    '    <table class="info-table">' +
    '      <tr><td class="label">Veículo:</td><td class="value"><strong>' +
    vehicleInfo +
    '</strong>' +
    (vehiclePlate ? ' (' + vehiclePlate + ')' : '') +
    '</td></tr>' +
    '      <tr><td class="label">Motorista:</td><td class="value">' +
    driverName +
    '</td></tr>' +
    '      <tr><td class="label">Data:</td><td class="value">' +
    formattedDate +
    '</td></tr>' +
    '      <tr><td class="label">Destino:</td><td class="value">' +
    destination +
    '</td></tr>' +
    '      <tr><td class="label">Centro de Custo:</td><td class="value">' +
    costCenter +
    '</td></tr>' +
    '      <tr><td class="label">Novo Status:</td><td class="value"><strong style="color: ' +
    statusColor +
    '">' +
    currentStatus +
    '</strong></td></tr>' +
    '    </table>' +
    (requestsLink
      ? '<div class="btn-container"><a href="' +
        requestsLink +
        '" class="btn" target="_blank">Acessar Minhas Solicitações</a></div>'
      : '') +
    '  </div>' +
    '  <div class="footer">' +
    '    Este é um email automático de notificação do Controle Combustível Volante.' +
    '  </div>' +
    '</div></body></html>'

  let mailClient
  let senderAddress = ''
  let senderName = 'Controle Combustível Volante'

  // Check if custom SMTP is configured in smtp_settings collection
  try {
    const smtpRecords = $app.findRecordsByFilter('smtp_settings', '', '-created', 1, 0)
    if (smtpRecords && smtpRecords.length > 0) {
      const sRec = smtpRecords[0]
      const sHost = sRec.getString('host')
      if (sHost) {
        const sPort = sRec.getInt('port') || 587
        const sUser = sRec.getString('username') || ''
        const sPass = sRec.getString('password') || ''
        const sTls = sRec.getBool('tls')
        const sAuth = sRec.getString('auth_method') || 'PLAIN'
        mailClient = $mailer.newSmtpClient({
          host: sHost,
          port: sPort,
          username: sUser,
          password: sPass,
          tls: sTls,
          authMethod: sAuth === 'LOGIN' ? 'LOGIN' : 'PLAIN',
        })
        senderAddress = sRec.getString('sender_address') || ''
        senderName = sRec.getString('sender_name') || senderName
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar cliente customizado de smtp_settings:', err)
  }

  // Fallback to default mail client if custom SMTP is not set
  if (!mailClient) {
    try {
      mailClient = $app.newMailClient()
    } catch (err) {
      console.error('Falha ao inicializar o cliente de email ($app.newMailClient):', err)
      return e.next()
    }
  }

  if (!senderAddress) {
    try {
      const settings = $app.settings()
      if (settings && settings.meta) {
        if (settings.meta.senderAddress) senderAddress = settings.meta.senderAddress
        if (settings.meta.senderName) senderName = settings.meta.senderName
      }
    } catch (err) {
      console.warn('Não foi possível obter configurações de remetente (meta.senderAddress):', err)
    }
  }

  if (!senderAddress) {
    senderAddress = 'noreply@controlecombustivel.local'
  }

  for (let i = 0; i < recipientEmails.length; i++) {
    const toEmail = recipientEmails[i]
    try {
      const message = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: toEmail }],
        subject: subject,
        html: htmlBody,
      })

      mailClient.send(message)
      console.log(
        'Notificação de atualização de status (' + currentStatus + ') enviada para:',
        toEmail,
      )
    } catch (err) {
      console.error(
        'Falha ao enviar email de notificação de status para ' +
          toEmail +
          ' (ID da solicitação: ' +
          e.record.id +
          '):',
        err,
      )
    }
  }

  return e.next()
}, 'fuel_requests')
