/**
 * Login com Google (OAuth 2.0 / OpenID Connect, fluxo "authorization code" com PKCE).
 *
 * Fica DESATIVADO até que GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI
 * estejam configurados no .env. Nada é simulado: sem credenciais, o botão apenas avisa
 * que o recurso não está configurado. Passo a passo no README.
 */
const crypto = require('node:crypto');
const { unavailable, badRequest } = require('../utils/httpError');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

const b64url = (buf) => buf.toString('base64url');

function createGoogleOAuthService({ config, users, clock, fetchImpl = globalThis.fetch }) {
  const enabled = () => config.google.enabled;

  /** Monta a URL de autorização e os valores temporários que vão em um cookie de curta duração. */
  function buildAuthorization() {
    if (!enabled()) throw unavailable('google_desativado', 'O login com Google ainda não foi configurado neste servidor.');
    const state = b64url(crypto.randomBytes(24));
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return { url: `${AUTH_URL}?${params}`, state, verifier };
  }

  /** Troca o código pelo id_token, valida-o junto ao Google e devolve o usuário local. */
  async function handleCallback({ code, state, expectedState, verifier }) {
    if (!enabled()) throw unavailable('google_desativado', 'O login com Google ainda não foi configurado neste servidor.');
    if (!code || !state || !expectedState || state !== expectedState) throw badRequest('Falha na verificação do login com Google. Tente novamente.');

    const tokenResponse = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    });
    if (!tokenResponse.ok) throw badRequest('O Google recusou a autorização.');
    const { id_token: idToken } = await tokenResponse.json();

    const infoResponse = await fetchImpl(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
    if (!infoResponse.ok) throw badRequest('Token do Google inválido.');
    const claims = await infoResponse.json();
    const issuerOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
    if (!issuerOk || claims.aud !== config.google.clientId || String(claims.email_verified) !== 'true') {
      throw badRequest('Não foi possível confirmar a conta Google.');
    }

    let user = users.findByGoogleSub(claims.sub);
    if (!user) {
      const existing = users.findByEmail(claims.email.toLowerCase());
      if (existing) {
        users.linkGoogle(existing.id, claims.sub);
        user = users.findById(existing.id);
      } else {
        const id = users.create({ email: claims.email.toLowerCase(), name: claims.name || claims.email, googleSub: claims.sub, createdAt: clock.now() });
        user = users.findById(id);
      }
    }
    return user;
  }

  return { enabled, buildAuthorization, handleCallback };
}

module.exports = { createGoogleOAuthService };
