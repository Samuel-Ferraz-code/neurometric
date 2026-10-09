/** Middlewares de sessão e proteção de rotas privadas. */
const { unauthorized } = require('../utils/httpError');

/** Lê o cookie de sessão e coloca o usuário autenticado em req.user (ou null). */
function sessionMiddleware({ authService, config }) {
  return (req, res, next) => {
    const token = req.cookies && req.cookies[config.session.cookieName];
    const resolved = authService.resolveSession(token);
    req.user = resolved ? resolved.user : null;
    req.sessionToken = resolved ? token : null;
    next();
  };
}

/** Protege rotas da API: responde 401 em JSON. */
function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

/** Protege páginas HTML: redireciona para o login e depois volta à página pedida. */
function requirePageAuth(req, res, next) {
  if (req.user) return next();
  const target = encodeURIComponent(req.originalUrl || req.url);
  res.redirect(302, `/login.html?next=${target}`);
}

module.exports = { sessionMiddleware, requireAuth, requirePageAuth };
