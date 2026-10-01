// PocketBase hook to authenticate Rubble users via JWT (SSO)
routerAdd('POST', '/backend/v1/auth/sso', (e) => {
  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  const token = (body.token || '').trim()
  if (!token) {
    return e.badRequestError('Token JWT do Rubble é obrigatório')
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return e.badRequestError('Formato do token inválido')
  }

  const jwtSecret = $os.getenv('RUBBLE_JWT_SECRET') || $os.getenv('JWT_SECRET') || ''
  if (!jwtSecret) {
    return e.badRequestError('Configuração de segurança JWT ausente no servidor')
  }

  // Helper base64url decode
  function base64urlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const raw = $security.parseBase64(base64)
    let s = ''
    for (let i = 0; i < raw.length; i++) {
      s += String.fromCharCode(raw[i])
    }
    return s
  }

  // Validate HMAC-SHA256 signature
  const headerB64 = parts[0]
  const payloadB64 = parts[1]
  const sigB64 = parts[2]
  const signingInput = headerB64 + '.' + payloadB64

  const expectedSigBytes = $security.hs256(signingInput, jwtSecret)
  const expectedSigB64 = $security.encodeBase64URL(expectedSigBytes)

  if (sigB64 !== expectedSigB64) {
    return e.badRequestError('Assinatura do token Rubble inválida')
  }

  let payload = {}
  try {
    payload = JSON.parse(base64urlDecode(payloadB64))
  } catch (err) {
    return e.badRequestError('Payload do token inválido')
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    return e.badRequestError('Token Rubble expirado')
  }

  const username = payload.username || ''
  const nome = payload.nome || username || 'Usuário Rubble'
  const role = payload.role || ''
  const isAdmin = role === 'admin'

  if (!username) {
    return e.badRequestError('Usuário não identificado no token')
  }

  const email = (payload.email || username + '@rubble.local').toLowerCase()

  const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
  let userRecord = null

  try {
    userRecord = $app.findFirstRecordByFilter('_pb_users_auth_', "email = {:email}", { email: email })
  } catch (_) {}

  if (!userRecord) {
    try {
      userRecord = new Record(usersCol)
      userRecord.setEmail(email)
      userRecord.setPassword($security.randomString(32))
      userRecord.setVerified(true)
      userRecord.set('name', nome)
      userRecord.set('admin', isAdmin)
      $app.save(userRecord)
    } catch (saveErr) {
      return e.badRequestError('Falha ao criar usuário local: ' + saveErr.message)
    }
  } else {
    // Sincroniza nome e flag de admin se alterado no Rubble
    let changed = false
    if (userRecord.getString('name') !== nome) {
      userRecord.set('name', nome)
      changed = true
    }
    if (userRecord.getBool('admin') !== isAdmin) {
      userRecord.set('admin', isAdmin)
      changed = true
    }
    if (changed) {
      try {
        $app.save(userRecord)
      } catch (_) {}
    }
  }

  // Gera token de autenticação oficial do PocketBase para o registro
  const pbToken = $tokens.recordAuthToken($app, userRecord)

  return e.json(200, {
    token: pbToken,
    record: userRecord,
  })
})
