/** Sessões, tokens de recuperação de senha e registro de tentativas de login. */
function createSessionRepository(db) {
  const insert = db.prepare('INSERT INTO sessions (id, user_id, remember, created_at, expires_at) VALUES (?, ?, ?, ?, ?)');
  const get = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const remove = db.prepare('DELETE FROM sessions WHERE id = ?');
  const removeByUser = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  const purge = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  return {
    create: (s) => insert.run(s.id, s.userId, s.remember ? 1 : 0, s.createdAt, s.expiresAt),
    find: (id) => get.get(id),
    delete: (id) => remove.run(id),
    deleteByUser: (userId) => removeByUser.run(userId),
    purgeExpired: (now) => purge.run(now),
  };
}

function createPasswordResetRepository(db) {
  const insert = db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)');
  const find = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?');
  const markUsed = db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?');
  const invalidateUser = db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL');
  return {
    create: (userId, tokenHash, expiresAt) => insert.run(userId, tokenHash, expiresAt),
    findByHash: (hash) => find.get(hash),
    markUsed: (id, now) => markUsed.run(now, id),
    invalidateForUser: (userId, now) => invalidateUser.run(now, userId),
  };
}

function createLoginAttemptRepository(db) {
  const insert = db.prepare('INSERT INTO login_attempts (email, ip, success, attempted_at) VALUES (?, ?, ?, ?)');
  const failsByEmail = db.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND success = 0 AND attempted_at > ?');
  const failsByIp = db.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND success = 0 AND attempted_at > ?');
  const clearEmail = db.prepare('DELETE FROM login_attempts WHERE email = ? AND success = 0');
  return {
    record: (email, ip, success, at) => insert.run(email, ip, success ? 1 : 0, at),
    failuresForEmail: (email, since) => failsByEmail.get(email, since).n,
    failuresForIp: (ip, since) => failsByIp.get(ip, since).n,
    clearFailures: (email) => clearEmail.run(email),
  };
}

module.exports = { createSessionRepository, createPasswordResetRepository, createLoginAttemptRepository };
