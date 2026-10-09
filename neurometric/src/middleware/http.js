/**
 * Middlewares de infraestrutura: cabeçalhos de segurança, cookies,
 * proteção contra requisições de outros sites e tratamento centralizado de erros.
 */
const { HttpError } = require('../utils/httpError');

/** Cabeçalhos de segurança (equivalente enxuto ao pacote helmet). */
function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try { out[key] = decodeURIComponent(part.slice(eq + 1).trim()); } catch { out[key] = part.slice(eq + 1).trim(); }
  }
  return out;
}

function cookies(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  next();
}

/** Adiciona um cookie à resposta. HttpOnly + SameSite=Lax por padrão. */
function setCookie(res, name, value, { maxAgeMs, httpOnly = true, secure = false, sameSite = 'Lax', path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (maxAgeMs !== undefined) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  const previous = res.getHeader('Set-Cookie');
  const list = previous ? (Array.isArray(previous) ? previous : [previous]) : [];
  res.setHeader('Set-Cookie', [...list, parts.join('; ')]);
}

function clearCookie(res, name, options = {}) {
  setCookie(res, name, '', { ...options, maxAgeMs: 0 });
}

/**
 * Requisições que alteram dados precisam ser JSON e vir do próprio site.
 * Junto com o cookie SameSite=Lax, isso impede ataques CSRF a partir de outros domínios.
 */
function sameOriginJson(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const type = req.headers['content-type'] || '';
  if (!type.startsWith('application/json')) {
    return next(new HttpError(415, 'formato_invalido', 'Envie os dados em formato JSON.'));
  }
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers.host;
    let originHost = null;
    try { originHost = new URL(origin).host; } catch { originHost = null; }
    if (originHost !== host) return next(new HttpError(403, 'origem_invalida', 'Origem da requisição não permitida.'));
  }
  next();
}

/** Converte funções async em middlewares que repassam erros ao tratador central. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFoundApi(req, res) {
  res.status(404).json({ erro: 'nao_encontrado', mensagem: 'Rota da API não encontrada.' });
}

/** Tratamento centralizado de erros: nunca expõe detalhes internos ao navegador. */
function errorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ erro: err.code, mensagem: err.message, campos: err.details });
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'json_invalido', mensagem: 'Corpo da requisição inválido.' });
    }
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ erro: 'muito_grande', mensagem: 'Requisição muito grande.' });
    }
    logger.error('[NeuroMetric] Erro inesperado:', err);
    res.status(500).json({ erro: 'erro_interno', mensagem: 'Ocorreu um erro inesperado. Tente novamente.' });
  };
}

module.exports = { securityHeaders, cookies, parseCookies, setCookie, clearCookie, sameOriginJson, asyncHandler, notFoundApi, errorHandler };
