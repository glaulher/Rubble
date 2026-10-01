onRecordAfterCreateSuccess((e) => {
  // Fetch details about the created fuel request
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
    console.warn('Erro ao buscar dados do veículo para notificação de email:', err)
  }

  let driverName = 'Não informado'
  try {
    const driverId = e.record.getString('driver')
    if (driverId) {
      const dRec = $app.findRecordById('drivers', driverId)
      driverName = dRec.getString('name')
    }
  } catch (err) {
    console.warn('Erro ao buscar motorista para notificação de email:', err)
  }

  let createdByName = 'Não informado'
  let createdByEmail = ''
  try {
    const creatorId = e.record.getString('user')
    if (creatorId) {
      const uRec = $app.findRecordById('users', creatorId)
      createdByName = uRec.getString('name') || uRec.getString('email') || creatorId
      createdByEmail = uRec.getString('email')
    }
  } catch (err) {
    console.warn('Erro ao buscar criador da solicitação para notificação de email:', err)
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
  const currentOdo = e.record.getInt('current_odometer')
  const odoStr = currentOdo ? currentOdo.toString() + ' km' : 'Não informado'

  // Query all admin users
  let adminRecords = []
  try {
    adminRecords = $app.findRecordsByFilter('users', 'admin = true', '-created', 100, 0)
  } catch (err) {
    console.error('Falha ao buscar usuários administradores para envio de email:', err)
  }

  if (!adminRecords || adminRecords.length === 0) {
    console.log('Nenhum administrador com admin = true encontrado para receber notificação.')
    return e.next()
  }

  const siteUrl = $os.getenv('SITE_URL') || $os.getenv('PB_INSTANCE_URL') || ''
  const requestsLink = siteUrl ? siteUrl + '/requests' : ''

  // Build the email template
  const subject =
    'Nova Solicitação de Combustível Aberta: ' +
    vehicleInfo +
    (vehiclePlate ? ' (' + vehiclePlate + ')' : '')
  const htmlBody =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }' +
    '.card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }' +
    '.header { background: #0284c7; color: #ffffff; padding: 24px; text-align: center; }' +
    '.header h1 { margin: 0; font-size: 20px; font-weight: 600; }' +
    '.header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }' +
    '.content { padding: 24px; }' +
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
    '    <h1>Nova Solicitação de Combustível</h1>' +
    '    <p>Controle Combustível Volante</p>' +
    '  </div>' +
    '  <div class="content">' +
    '    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">Uma nova solicitação de abastecimento foi registrada no sistema e aguarda análise/aprovação.</p>' +
    '    <table class="info-table">' +
    '      <tr><td class="label">Veículo:</td><td class="value"><strong>' +
    vehicleInfo +
    '</strong>' +
    (vehiclePlate ? ' (' + vehiclePlate + ')' : '') +
    '</td></tr>' +
    '      <tr><td class="label">Motorista:</td><td class="value">' +
    driverName +
    '</td></tr>' +
    '      <tr><td class="label">Data Prevista:</td><td class="value">' +
    formattedDate +
    '</td></tr>' +
    '      <tr><td class="label">Destino:</td><td class="value">' +
    destination +
    '</td></tr>' +
    '      <tr><td class="label">Centro de Custo:</td><td class="value">' +
    costCenter +
    '</td></tr>' +
    '      <tr><td class="label">Odômetro:</td><td class="value">' +
    odoStr +
    '</td></tr>' +
    '      <tr><td class="label">Criado por:</td><td class="value">' +
    createdByName +
    (createdByEmail ? ' (' + createdByEmail + ')' : '') +
    '</td></tr>' +
    '    </table>' +
    (requestsLink
      ? '<div class="btn-container"><a href="' +
        requestsLink +
        '" class="btn" target="_blank">Ver Solicitação no Sistema</a></div>'
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

  for (let i = 0; i < adminRecords.length; i++) {
    const adminRec = adminRecords[i]
    let adminEmail = ''
    try {
      adminEmail = adminRec.getString('email')
    } catch (_) {}

    if (!adminEmail) continue

    try {
      const message = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: adminEmail }],
        subject: subject,
        html: htmlBody,
      })

      mailClient.send(message)
      console.log(
        'Notificação de nova solicitação de combustível enviada para o administrador:',
        adminEmail,
      )
    } catch (err) {
      console.error(
        'Falha ao enviar email de notificação de combustível para ' +
          adminEmail +
          ' (ID da solicitação: ' +
          e.record.id +
          '):',
        err,
      )
    }
  }

  return e.next()
}, 'fuel_requests')
