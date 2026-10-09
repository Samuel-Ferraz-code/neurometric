/**
 * Regras de autenticação: cadastro, login com limitação de tentativas,
 * sessões, logout e recuperação de senha por token temporário.
 */
const crypto = require('node:crypto');
const { hashPassword, verifyPassword } = require('./passwordService');
const { validateRegistration, validateEmail, validatePassword } = require('./validation');
const { publicUser } = require('../repositories/userRepository');
const { badRequest, conflict, tooMany, unauthorized } = require('../utils/httpError');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');

function createAuthService({ users, sessions, resets, loginAttempts, clock, config, logger = console }) {
  /** Cria uma sessão e devolve o token que vai no cookie (o banco guarda só o hash). */
  function startSession(userId, remember) {
    const token = randomToken();
    const now = clock.now();
    const ttl = remember ? config.session.rememberTtlMs : config.session.ttlMs;
    sessions.create({ id: sha256(token), userId, remember, createdAt: now, expiresAt: now + ttl });
    return { token, remember: Boolean(remember), maxAgeMs: ttl };
  }

  async function register(body) {
    const { ok, errors, data } = validateRegistration(body);
    if (!ok) throw badRequest('Confira os campos destacados.', errors);
    if (users.findByEmail(data.email)) throw conflict('Já existe uma conta com este e-mail.');
    const passwordHash = await hashPassword(data.password);
    const id = users.create({ ...data, passwordHash, createdAt: clock.now() });
    return { user: publicUser(users.findById(id)), session: startSession(id, false) };
  }

  async function login({ email: rawEmail, password, remember }, ip = 'desconhecido') {
    const email = validateEmail(rawEmail);
    if (email.error || typeof password !== 'string' || !password) throw badRequest('Informe e-mail e senha.');

    const since = clock.now() - config.loginLimit.windowMs;
    if (loginAttempts.failuresForEmail(email.value, since) >= config.loginLimit.maxPerEmail
      || loginAttempts.failuresForIp(ip, since) >= config.loginLimit.maxPerIp) {
      const minutes = Math.round(config.loginLimit.windowMs / 60000);
      throw tooMany(`Muitas tentativas de login. Aguarde ${minutes} minutos e tente novamente.`);
    }

    const user = users.findByEmail(email.value);
    // Mesmo sem usuário, executamos a verificação para não revelar quais e-mails existem pelo tempo de resposta.
    const valid = user && user.password_hash ? await verifyPassword(user.password_hash, password) : (await hashPassword(password), false);
    loginAttempts.record(email.value, ip, valid, clock.now());
    if (!valid) throw unauthorized('E-mail ou senha incorretos.');

    loginAttempts.clearFailures(email.value);
    return { user: publicUser(user), session: startSession(user.id, Boolean(remember)) };
  }

  /** Retorna o usuário da sessão, ou null se o token for inválido ou expirado. */
  function resolveSession(token) {
    if (!token) return null;
    const session = sessions.find(sha256(token));
    if (!session) return null;
    if (session.expires_at <= clock.now()) {
      sessions.delete(session.id);
      return null;
    }
    const user = users.findById(session.user_id);
    return user ? { user, sessionId: session.id } : null;
  }

  function logout(token) {
    if (token) sessions.delete(sha256(token));
  }

  /** Gera um token de redefinição. A resposta é sempre a mesma, exista ou não a conta. */
  function requestPasswordReset(rawEmail) {
    const email = validateEmail(rawEmail);
    if (email.error) throw badRequest(email.error);
    const user = users.findByEmail(email.value);
    if (!user) return { link: null };
    const token = randomToken();
    const now = clock.now();
    resets.invalidateForUser(user.id, now);
    resets.create(user.id, sha256(token), now + config.passwordReset.ttlMs);
    const link = `${config.baseUrl}/redefinir-senha.html?token=${token}`;
    if (config.passwordReset.logLinkToConsole) {
      logger.log(`[NeuroMetric] Link de redefinição de senha para ${user.email} (válido por ${Math.round(config.passwordReset.ttlMs / 60000)} min):\n  ${link}`);
    }
    return { link };
  }

  async function resetPassword({ token, password, confirmPassword }) {
    if (typeof token !== 'string' || !token) throw badRequest('Link de redefinição inválido.');
    const check = validatePassword(password, confirmPassword);
    if (check.error) throw badRequest(check.error, { password: check.error });
    const record = resets.findByHash(sha256(token));
    const now = clock.now();
    if (!record || record.used_at || record.expires_at <= now) throw badRequest('Este link expirou ou já foi utilizado. Solicite um novo.');
    const hash = await hashPassword(password);
    users.updatePassword(record.user_id, hash);
    resets.markUsed(record.id, now);
    sessions.deleteByUser(record.user_id); // encerra sessões antigas por segurança
    return { ok: true };
  }

  return { register, login, resolveSession, logout, requestPasswordReset, resetPassword, startSession };
}

module.exports = { createAuthService, sha256 };
