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

  const jwtSecret = $os.getenv('RUBBLE_JWT_SECRET') || $os.getenv('JWT_SECRET') || ''
  if (!jwtSecret) {
    return e.badRequestError('Configuração de segurança JWT ausente no servidor')
  }

  let payload
  try {
    payload = $security.parseJWT(token, jwtSecret)
  } catch (err) {
    return e.badRequestError('Token Rubble inválido ou expirado: ' + (err.message || String(err)))
  }

  const username = payload.username || ''
  const nome = payload.nome || username || 'Usuário Rubble'
  const role = payload.role || ''
  // Apenas o admin do Rubble tem privilégios de admin no controle de combustível
  const isAdmin = role === 'admin'

  if (!username) {
    return e.badRequestError('Usuário não identificado no token')
  }

  const email = (payload.email || username + '@rubble.local').toLowerCase()

  const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
  let userRecord = null

  try {
    userRecord = $app.findFirstRecordByFilter('_pb_users_auth_', 'email = {:email}', { email: email })
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
    // Sincroniza nome e flag de admin estritamente com base no Rubble
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
  const pbToken = userRecord.newAuthToken()

  return e.json(200, {
    token: pbToken,
    record: userRecord,
  })
})
