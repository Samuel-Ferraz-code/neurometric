/**
 * Utilitários dos testes: sobe uma instância isolada do servidor (banco em memória,
 * relógio controlável, banco de questões FICTÍCIO) e oferece um cliente HTTP com cookies.
 */
const path = require('node:path');
const { createApp } = require('../src/app');
const { createFakeClock } = require('../src/utils/clock');
const baseConfig = require('../src/config');

const FIXTURE_BANK = path.join(__dirname, 'fixtures', 'banco-ficticio.json');

async function startServer({ bankFile = FIXTURE_BANK, configOverrides = {} } = {}) {
  const clock = createFakeClock();
  const logs = [];
  const logger = { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) };
  const app = createApp({
    clock,
    logger,
    config: {
      ...baseConfig,
      databaseFile: ':memory:',
      questionBankFile: bankFile,
      normsFile: path.join(__dirname, 'fixtures', 'nao-existe.json'),
      passwordReset: { ...baseConfig.passwordReset, logLinkToConsole: true },
      ...configOverrides,
    },
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { app, server, base, clock, logs, close: () => new Promise((r) => server.close(r)) };
}

/** Cliente HTTP mínimo que guarda cookies entre requisições (como um navegador). */
function client(base) {
  const jar = new Map();
  async function request(method, url, body, headers = {}) {
    const h = { ...headers };
    if (jar.size) h.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (body !== undefined) h['content-type'] = h['content-type'] || 'application/json';
    const res = await fetch(base + url, {
      method,
      headers: h,
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const [k, v] = pair.split('=');
      if (/max-age=0/i.test(attrs.join(';'))) jar.delete(k.trim());
      else jar.set(k.trim(), v);
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, headers: res.headers, json, text };
  }
  return {
    jar,
    get: (u, h) => request('GET', u, undefined, h),
    post: (u, b = {}, h) => request('POST', u, b, h),
  };
}

const VALID_USER = {
  email: 'ana@example.com',
  name: 'Ana Souza',
  age: 25,
  phone: '(11) 98765-4321',
  password: 'segura123',
  confirmPassword: 'segura123',
  acceptTerms: true,
};

async function registeredClient(base, overrides = {}) {
  const c = client(base);
  const res = await c.post('/api/auth/cadastro', { ...VALID_USER, ...overrides });
  if (res.status !== 201) throw new Error(`cadastro falhou: ${res.status} ${res.text}`);
  return c;
}

module.exports = { startServer, client, registeredClient, VALID_USER, FIXTURE_BANK };
