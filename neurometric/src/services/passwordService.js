/**
 * Hash de senhas.
 *
 * - Padrão: Argon2id (pacote @node-rs/argon2, instalado pelo `npm install`).
 * - Alternativa automática: scrypt nativo do Node.js, também resistente a força bruta,
 *   usada apenas se o pacote Argon2 não estiver disponível no computador.
 *
 * O formato salvo indica o algoritmo ("$argon2id$..." ou "scrypt$..."), então
 * senhas criadas com qualquer um dos dois continuam válidas.
 */
const crypto = require('node:crypto');

let argon2 = null;
try {
  argon2 = require('@node-rs/argon2');
} catch {
  argon2 = null;
}

// Parâmetros recomendados pela OWASP para Argon2id (19 MiB, 2 iterações, 1 thread).
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 /* Argon2id */ };
// scrypt: N=2^15, r=8, p=1 (~32 MiB de memória).
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem },
      (err, key) => (err ? reject(err) : resolve(key)));
  });
}

async function hashPassword(password) {
  if (argon2) return argon2.hash(password, ARGON2_OPTIONS);
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(hash, password) {
  if (!hash) return false;
  if (hash.startsWith('$argon2')) {
    if (!argon2) throw new Error('Senha salva com Argon2, mas o pacote @node-rs/argon2 não está instalado. Rode "npm install".');
    return argon2.verify(hash, password);
  }
  if (hash.startsWith('scrypt$')) {
    const [, , , , saltB64, keyB64] = hash.split('$');
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  return false;
}

const algorithmInUse = () => (argon2 ? 'argon2id' : 'scrypt');

module.exports = { hashPassword, verifyPassword, algorithmInUse };
