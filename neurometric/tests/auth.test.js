/** Testes de cadastro, login, senhas, sessões, recuperação de senha e proteção de rotas. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, registeredClient, VALID_USER } = require('./helpers');
const { hashPassword, verifyPassword } = require('../src/services/passwordService');

let srv;
test.before(async () => { srv = await startServer(); });
test.after(() => srv.close());

test('senha é guardada apenas como hash e verificada corretamente', async () => {
  const hash = await hashPassword('segura123');
  assert.notEqual(hash, 'segura123');
  assert.match(hash, /^(\$argon2id\$|scrypt\$)/);
  assert.equal(await verifyPassword(hash, 'segura123'), true);
  assert.equal(await verifyPassword(hash, 'errada123'), false);
});

test('cadastro válido cria a conta, inicia sessão com cookie HttpOnly e não expõe a senha', async () => {
  const c = client(srv.base);
  const res = await c.post('/api/auth/cadastro', { ...VALID_USER, email: 'novo@example.com' });
  assert.equal(res.status, 201);
  assert.equal(res.json.usuario.email, 'novo@example.com');
  assert.equal(res.json.usuario.phone, '11987654321');
  assert.equal(res.json.usuario.password_hash, undefined);
  const cookie = res.headers.getSetCookie().join(';');
  assert.match(cookie, /nm_sid=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  const row = srv.app.locals.db.prepare('SELECT password_hash FROM users WHERE email = ?').get('novo@example.com');
  assert.notEqual(row.password_hash, VALID_USER.password);
});

test('cadastro recusa senhas diferentes, senha fraca, idade inválida, telefone inválido e termos não aceitos', async () => {
  const c = client(srv.base);
  const cases = [
    [{ confirmPassword: 'outra1234' }, 'password', /não coincidem/],
    [{ password: 'curta1', confirmPassword: 'curta1' }, 'password', /mínimo 8/],
    [{ password: 'somenteletras', confirmPassword: 'somenteletras' }, 'password', /letras e números/],
    [{ age: 7 }, 'age', /idade válida/],
    [{ phone: '1234' }, 'phone', /telefone/],
    [{ acceptTerms: false }, 'acceptTerms', /Termos/],
    [{ email: 'invalido' }, 'email', /e-mail válido/],
  ];
  for (const [override, field, pattern] of cases) {
    const res = await c.post('/api/auth/cadastro', { ...VALID_USER, email: 'x@example.com', ...override });
    assert.equal(res.status, 400, JSON.stringify(override));
    assert.match(res.json.campos[field], pattern);
  }
});

test('e-mail duplicado retorna 409', async () => {
  await registeredClient(srv.base, { email: 'dup@example.com' });
  const res = await client(srv.base).post('/api/auth/cadastro', { ...VALID_USER, email: 'DUP@example.com' });
  assert.equal(res.status, 409);
});

test('login com credenciais corretas funciona; senha errada retorna 401 com mensagem genérica', async () => {
  await registeredClient(srv.base, { email: 'login@example.com' });
  const ok = await client(srv.base).post('/api/auth/login', { email: 'login@example.com', password: VALID_USER.password });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.redirecionar, '/iniciar-teste.html');
  const bad = await client(srv.base).post('/api/auth/login', { email: 'login@example.com', password: 'errada123' });
  assert.equal(bad.status, 401);
  assert.equal(bad.json.mensagem, 'E-mail ou senha incorretos.');
  const unknown = await client(srv.base).post('/api/auth/login', { email: 'ninguem@example.com', password: 'errada123' });
  assert.equal(unknown.json.mensagem, 'E-mail ou senha incorretos.');
});

test('"Lembrar de mim" gera cookie persistente; sem ele o cookie é de sessão', async () => {
  await registeredClient(srv.base, { email: 'lembrar@example.com' });
  const sem = await client(srv.base).post('/api/auth/login', { email: 'lembrar@example.com', password: VALID_USER.password });
  assert.doesNotMatch(sem.headers.getSetCookie().join(';'), /Max-Age/);
  const com = await client(srv.base).post('/api/auth/login', { email: 'lembrar@example.com', password: VALID_USER.password, remember: true });
  assert.match(com.headers.getSetCookie().join(';'), /Max-Age=2592000/);
});

test('limite de tentativas: após 5 falhas o login é bloqueado (429) e libera depois da janela', async () => {
  await registeredClient(srv.base, { email: 'bruta@example.com' });
  const c = client(srv.base);
  for (let i = 0; i < 5; i += 1) {
    const r = await c.post('/api/auth/login', { email: 'bruta@example.com', password: 'errada123' });
    assert.equal(r.status, 401);
  }
  const blocked = await c.post('/api/auth/login', { email: 'bruta@example.com', password: VALID_USER.password });
  assert.equal(blocked.status, 429);
  srv.clock.advance(16 * 60 * 1000);
  const after = await c.post('/api/auth/login', { email: 'bruta@example.com', password: VALID_USER.password });
  assert.equal(after.status, 200);
});

test('rotas privadas exigem sessão; logout invalida a sessão', async () => {
  const anon = client(srv.base);
  assert.equal((await anon.get('/api/auth/me')).status, 401);
  assert.equal((await anon.post('/api/tentativas')).status, 401);
  assert.equal((await anon.get('/api/tentativas')).status, 401);
  assert.equal((await anon.get('/api/tentativas/1/resultado')).status, 401);

  assert.deepEqual((await anon.get('/api/auth/sessao')).json, { usuario: null });

  const c = await registeredClient(srv.base, { email: 'sair@example.com' });
  assert.equal((await c.get('/api/auth/sessao')).json.usuario.email, 'sair@example.com');
  assert.equal((await c.get('/api/auth/me')).json.usuario.email, 'sair@example.com');
  const token = c.jar.get('nm_sid');
  assert.equal((await c.post('/api/auth/logout')).status, 200);
  const replay = client(srv.base);
  replay.jar.set('nm_sid', token);
  assert.equal((await replay.get('/api/auth/me')).status, 401);
});

test('páginas privadas redirecionam para o login quando não há sessão', async () => {
  const anon = client(srv.base);
  for (const page of ['/teste.html', '/resultado.html', '/teste']) {
    const res = await anon.get(page);
    assert.equal(res.status, 302, page);
    assert.match(res.headers.get('location'), /^\/login\.html\?next=/);
  }
  assert.equal((await anon.get('/index.html')).status, 200);
});

test('sessão comum expira após 12 horas', async () => {
  const c = await registeredClient(srv.base, { email: 'expira@example.com' });
  srv.clock.advance(12 * 60 * 60 * 1000 + 1);
  assert.equal((await c.get('/api/auth/me')).status, 401);
});

test('API recusa requisições que não são JSON e requisições de outra origem (CSRF)', async () => {
  const c = client(srv.base);
  const form = await c.post('/api/auth/login', 'email=a&password=b', { 'content-type': 'application/x-www-form-urlencoded' });
  assert.equal(form.status, 415);
  const cross = await c.post('/api/auth/login', { email: 'a@a.com', password: 'x' }, { origin: 'https://site-malicioso.com' });
  assert.equal(cross.status, 403);
});

test('recuperação de senha: token temporário, uso único, invalida sessões antigas', async () => {
  const c = await registeredClient(srv.base, { email: 'esqueci@example.com' });
  const generic = await client(srv.base).post('/api/auth/esqueci-senha', { email: 'naoexiste@example.com' });
  const res = await client(srv.base).post('/api/auth/esqueci-senha', { email: 'esqueci@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.json.mensagem, generic.json.mensagem); // não revela se a conta existe
  const line = srv.logs.reverse().find((l) => l.includes('redefinir-senha.html?token='));
  srv.logs.reverse();
  const token = line.match(/token=([\w-]+)/)[1];

  const mismatch = await client(srv.base).post('/api/auth/redefinir-senha', { token, password: 'novaSenha9', confirmPassword: 'outra' });
  assert.equal(mismatch.status, 400);
  const ok = await client(srv.base).post('/api/auth/redefinir-senha', { token, password: 'novaSenha9', confirmPassword: 'novaSenha9' });
  assert.equal(ok.status, 200);
  const reuse = await client(srv.base).post('/api/auth/redefinir-senha', { token, password: 'outraSenha9', confirmPassword: 'outraSenha9' });
  assert.equal(reuse.status, 400);

  assert.equal((await c.get('/api/auth/me')).status, 401, 'sessão antiga deve ser encerrada');
  const login = await client(srv.base).post('/api/auth/login', { email: 'esqueci@example.com', password: 'novaSenha9' });
  assert.equal(login.status, 200);
});

test('token de redefinição expira em 30 minutos', async () => {
  await registeredClient(srv.base, { email: 'expirado@example.com' });
  await client(srv.base).post('/api/auth/esqueci-senha', { email: 'expirado@example.com' });
  const token = [...srv.logs].reverse().find((l) => l.includes('token=')).match(/token=([\w-]+)/)[1];
  srv.clock.advance(31 * 60 * 1000);
  const res = await client(srv.base).post('/api/auth/redefinir-senha', { token, password: 'novaSenha9', confirmPassword: 'novaSenha9' });
  assert.equal(res.status, 400);
});

test('login com Google fica desativado sem credenciais (nada é simulado)', async () => {
  const c = client(srv.base);
  assert.deepEqual((await c.get('/api/auth/config')).json, { google: false });
  const res = await c.get('/api/auth/google');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/login.html?google=desativado');
});
