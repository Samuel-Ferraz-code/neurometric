/** Acesso à tabela de usuários. Todas as consultas são parametrizadas (sem concatenação de SQL). */
function createUserRepository(db) {
  const insert = db.prepare(`
    INSERT INTO users (email, name, age, phone, password_hash, google_sub, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const byId = db.prepare('SELECT * FROM users WHERE id = ?');
  const byGoogle = db.prepare('SELECT * FROM users WHERE google_sub = ?');
  const setPassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  const setGoogle = db.prepare('UPDATE users SET google_sub = ? WHERE id = ?');

  return {
    create({ email, name, age = null, phone = null, passwordHash = null, googleSub = null, createdAt }) {
      const info = insert.run(email, name, age, phone, passwordHash, googleSub, createdAt);
      return Number(info.lastInsertRowid);
    },
    findByEmail: (email) => byEmail.get(email),
    findById: (id) => byId.get(id),
    findByGoogleSub: (sub) => byGoogle.get(sub),
    updatePassword: (id, hash) => setPassword.run(hash, id),
    linkGoogle: (id, sub) => setGoogle.run(sub, id),
  };
}

/** Remove campos sensíveis antes de enviar o usuário ao navegador. */
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, age: user.age, phone: user.phone };
}

module.exports = { createUserRepository, publicUser };
