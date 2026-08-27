import base64, json, hmac, hashlib, time

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def make_rubble_token(payload: dict, secret: str) -> str:
    header = b64url_encode(json.dumps({"typ":"JWT","alg":"HS256"}, separators=(",",":")).encode())
    body = b64url_encode(json.dumps(payload, separators=(",",":")).encode())
    sig = hmac.new(secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{b64url_encode(sig)}"

SECRET = "a" * 64

def test_validar_jwt_rubble_accepts_rubble_iss():
    from robo_ponto_web import validar_jwt_rubble, JWT_ISSUER
    payload = {"iss":"rubble","sub":"admin","nome":"Admin","role":"admin","iat":int(time.time()),"exp":int(time.time())+3600}
    tok = make_rubble_token(payload, SECRET)
    # monkey patch secret to match
    import robo_ponto_web as mod
    orig = mod._jwt_secret
    mod._jwt_secret = lambda: SECRET.encode()
    try:
        dados, err = mod.validar_jwt_rubble(tok)
        assert dados is not None, err
        assert dados["usuario"] == "admin"
    finally:
        mod._jwt_secret = orig

def test_validar_jwt_rubble_rejects_wrong_iss():
    import robo_ponto_web as mod
    payload = {"iss":"evil","sub":"admin","iat":int(time.time()),"exp":int(time.time())+3600}
    tok = make_rubble_token(payload, SECRET)
    orig = mod._jwt_secret
    mod._jwt_secret = lambda: SECRET.encode()
    try:
        dados, err = mod.validar_jwt_rubble(tok)
        assert dados is None
    finally:
        mod._jwt_secret = orig
