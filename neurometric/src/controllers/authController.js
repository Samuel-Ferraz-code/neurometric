/** Controlador de autenticação: traduz HTTP ⇄ authService. */
const { setCookie, clearCookie } = require('../middleware/http');
const { publicUser } = require('../repositories/userRepository');

function createAuthController({ authService, googleService, config }) {
  const cookieOptions = { secure: config.session.secureCookie };
  const OAUTH_COOKIE = 'nm_oauth';

  /** "Lembrar de mim" → cookie persistente; senão, cookie de sessão (some ao fechar o navegador). */
  function writeSessionCookie(res, session) {
    setCookie(res, config.session.cookieName, session.token, {
      ...cookieOptions,
      maxAgeMs: session.remember ? session.maxAgeMs : undefined,
    });
  }

  /** Só permite redirecionar para páginas do próprio site. */
  const safeNext = (value) => (typeof value === 'string' && /^\/(?!\/)[\w\-./?=&%]*$/.test(value) ? value : '/iniciar-teste.html');

  return {
    async register(req, res) {
      const { user, session } = await authService.register(req.body);
      writeSessionCookie(res, session);
      res.status(201).json({ usuario: user, redirecionar: '/iniciar-teste.html' });
    },

    async login(req, res) {
      const { user, session } = await authService.login(req.body || {}, req.ip);
      writeSessionCookie(res, session);
      res.json({ usuario: user, redirecionar: safeNext(req.body && req.body.next) });
    },

    logout(req, res) {
      authService.logout(req.sessionToken);
      clearCookie(res, config.session.cookieName, cookieOptions);
      res.json({ ok: true });
    },

    me(req, res) {
      res.json({ usuario: publicUser(req.user) });
    },

    /** Versão pública de "me": responde 200 com usuario = null para visitantes. */
    session(req, res) {
      res.json({ usuario: req.user ? publicUser(req.user) : null });
    },

    config(req, res) {
      res.json({ google: googleService.enabled() });
    },

    forgotPassword(req, res) {
      authService.requestPasswordReset(req.body && req.body.email);
      res.json({ mensagem: 'Se existir uma conta com este e-mail, enviaremos as instruções para redefinir a senha.' });
    },

    async resetPassword(req, res) {
      await authService.resetPassword(req.body || {});
      res.json({ mensagem: 'Senha redefinida. Faça login com a nova senha.' });
    },

    googleStart(req, res) {
      if (!googleService.enabled()) return res.redirect(302, '/login.html?google=desativado');
      const { url, state, verifier } = googleService.buildAuthorization();
      setCookie(res, OAUTH_COOKIE, `${state}.${verifier}`, { ...cookieOptions, maxAgeMs: 10 * 60 * 1000 });
      res.redirect(302, url);
    },

    async googleCallback(req, res) {
      const [expectedState, verifier] = String(req.cookies[OAUTH_COOKIE] || '').split('.');
      clearCookie(res, OAUTH_COOKIE, cookieOptions);
      try {
        const user = await googleService.handleCallback({ code: req.query.code, state: req.query.state, expectedState, verifier });
        writeSessionCookie(res, authService.startSession(user.id, false));
        res.redirect(302, '/iniciar-teste.html');
      } catch {
        res.redirect(302, '/login.html?google=erro');
      }
    },
  };
}

module.exports = { createAuthController };
