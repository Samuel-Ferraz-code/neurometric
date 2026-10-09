/**
 * Testes do fluxo da avaliação: ordem fixa, sigilo do gabarito, memorização,
 * cronômetro geral e individual, persistência ao atualizar, respostas e finalização.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { startServer, registeredClient, FIXTURE_BANK } = require('./helpers');

const BANK = JSON.parse(fs.readFileSync(FIXTURE_BANK, 'utf8'));
const KEY = Object.fromEntries(BANK.questoes.map((q) => [q.id, q.resposta]));
const wrongOf = (letter) => (letter === 'A' ? 'B' : 'A');

let srv;
let seq = 0;
test.before(async () => { srv = await startServer(); });
test.after(() => srv.close());

async function newUser() {
  seq += 1;
  return registeredClient(srv.base, { email: `aluno${seq}@example.com` });
}

/** Avança até a fase "questao" (pulando telas de memorização) e devolve o estado. */
async function presentQuestion(c, id) {
  let state = (await c.post(`/api/tentativas/${id}/apresentar`)).json;
  while (state.fase === 'memorizacao') {
    srv.clock.advance(state.memorizacao.terminaEm - srv.clock.now());
    state = (await c.post(`/api/tentativas/${id}/apresentar`)).json;
  }
  return state;
}

/** Responde todas as questões; `plan(pos)` devolve {letra, segundos}. */
async function runAttempt(c, plan) {
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  for (let pos = 1; pos <= 10; pos += 1) {
    const state = await presentQuestion(c, tentativaId);
    const { letra, segundos } = plan(pos, state.questao);
    srv.clock.advance(segundos * 1000);
    const res = await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: state.questao.id, alternativa: letra });
    assert.equal(res.status, 200, res.text);
  }
  return tentativaId;
}

test('informações públicas do teste: 10 questões, sem limite de tempo, sem conteúdo das questões', async () => {
  const info = (await (await registeredClient(srv.base, { email: 'info@example.com' })).get('/api/teste/info')).json;
  assert.equal(info.bancoInstalado, true);
  assert.equal(info.total, 10);
  assert.equal(info.limiteDeTempo, null);
  assert.equal(info.questoes, undefined);
});

test('questões são apresentadas em ordem fixa (1 a 10) e nunca trazem gabarito ou explicação', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  const seen = [];
  for (let pos = 1; pos <= 10; pos += 1) {
    const state = await presentQuestion(c, tentativaId);
    const raw = JSON.stringify(state);
    assert.equal(state.posicao, pos);
    assert.equal(state.total, 10);
    assert.equal(state.questao.alternativas.length, 5);
    assert.doesNotMatch(raw, /resposta|explica|correct/i);
    seen.push(state.questao.id);
    srv.clock.advance(3000);
    await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: state.questao.id, alternativa: 'A' });
  }
  assert.deepEqual(seen, BANK.questoes.map((q) => q.id));
});

test('cronômetro individual: tempo registrado pelo servidor, preservado ao atualizar a página', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  const first = await presentQuestion(c, tentativaId);
  srv.clock.advance(20000);
  const refreshed = await presentQuestion(c, tentativaId); // "F5" no meio da questão
  assert.equal(refreshed.inicioQuestao, first.inicioQuestao);
  assert.equal(refreshed.inicioGeral, first.inicioGeral);
  assert.equal(refreshed.servidorAgora - refreshed.inicioQuestao, 20000);
  srv.clock.advance(22000);
  const res = await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: first.questao.id, alternativa: 'E' });
  assert.equal(res.json.segundos, 42);
  const next = await presentQuestion(c, tentativaId);
  assert.equal(next.posicao, 2);
  assert.equal(next.inicioQuestao, srv.clock.now(), 'cronômetro da questão reinicia em 00:00');
  assert.equal(next.inicioGeral, first.inicioGeral, 'cronômetro geral não reinicia');
});

test('o navegador não consegue alterar os tempos: campos extras no corpo são ignorados', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  const q = await presentQuestion(c, tentativaId);
  srv.clock.advance(15000);
  const res = await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: q.questao.id, alternativa: 'A', segundos: 1, presented_at: 0 });
  assert.equal(res.json.segundos, 15);
});

test('resposta duplicada, questão fora de ordem e alternativa inválida são recusadas', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  const q1 = await presentQuestion(c, tentativaId);
  assert.equal((await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: q1.questao.id, alternativa: 'Z' })).status, 400);
  assert.equal((await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: 5, alternativa: 'A' })).status, 409);
  assert.equal((await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: q1.questao.id, alternativa: 'A' })).status, 200);
  const dup = await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: q1.questao.id, alternativa: 'E' });
  assert.equal(dup.status, 409);
  const stored = srv.app.locals.db.prepare('SELECT COUNT(*) n, MAX(selected_letter) l FROM answers WHERE attempt_id = ? AND question_id = ?').get(tentativaId, q1.questao.id);
  assert.equal(stored.n, 1);
  assert.equal(stored.l, 'A', 'resposta confirmada não pode ser alterada');
});

test('não é possível responder antes de a questão ser apresentada', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  const res = await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: 1, alternativa: 'A' });
  assert.equal(res.status, 409);
});

test('memorização: sequência aparece antes da questão 6, some durante a resposta e o tempo da questão começa ao fim da exibição', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  for (let pos = 1; pos <= 5; pos += 1) {
    const s = await presentQuestion(c, tentativaId);
    await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: s.questao.id, alternativa: 'A' });
  }
  const memo = (await c.post(`/api/tentativas/${tentativaId}/apresentar`)).json;
  assert.equal(memo.fase, 'memorizacao');
  assert.equal(memo.memorizacao.sequencia, '8 1 5 3');
  assert.equal(memo.memorizacao.duracaoMs, 5000);
  assert.equal(memo.questao, undefined, 'a pergunta não é revelada durante a memorização');

  srv.clock.advance(2000);
  const again = (await c.post(`/api/tentativas/${tentativaId}/apresentar`)).json; // atualizou a página
  assert.equal(again.fase, 'memorizacao');
  assert.equal(again.memorizacao.terminaEm, memo.memorizacao.terminaEm, 'atualizar não reinicia a exibição');

  srv.clock.advance(10000); // usuário demorou para voltar
  const q6 = (await c.post(`/api/tentativas/${tentativaId}/apresentar`)).json;
  assert.equal(q6.fase, 'questao');
  assert.equal(q6.posicao, 6);
  assert.equal(q6.inicioQuestao, memo.memorizacao.terminaEm);
  assert.doesNotMatch(JSON.stringify(q6), /8 1 5 3/, 'sequência não fica visível durante a resposta');
});

test('fluxo completo: 8 acertos = 80%, tempos total/médio/extremos e revisão com gabarito e explicações', async () => {
  const c = await newUser();
  const secondsPlan = [42, 30, 25, 18, 61, 12, 33, 27, 15, 37];
  const id = await runAttempt(c, (pos, q) => ({
    letra: pos <= 8 ? KEY[q.id] : wrongOf(KEY[q.id]),
    segundos: secondsPlan[pos - 1],
  }));

  const result = await c.get(`/api/tentativas/${id}/resultado`);
  assert.equal(result.status, 200);
  const r = result.json;
  assert.equal(r.tentativa.status, 'finalizada');
  assert.equal(r.resumo.total, 10);
  assert.equal(r.resumo.acertos, 8);
  assert.equal(r.resumo.erros, 2);
  assert.equal(r.resumo.naoRespondidas, 0);
  assert.equal(r.resumo.aproveitamento, 80);
  const memoSeconds = 5 + 5; // as duas telas de memorização entram no cronômetro geral
  assert.equal(r.resumo.tempoTotalSegundos, secondsPlan.reduce((a, b) => a + b, 0) + memoSeconds);
  assert.equal(r.resumo.tempoMedioSegundos, 30);
  assert.deepEqual([r.resumo.questaoMaisRapida.position, r.resumo.questaoMaisRapida.seconds], [6, 12]);
  assert.deepEqual([r.resumo.questaoMaisDemorada.position, r.resumo.questaoMaisDemorada.seconds], [5, 61]);
  assert.equal(r.qi.status, 'indisponivel');

  assert.equal(r.questoes.length, 10);
  for (const q of r.questoes) {
    const original = BANK.questoes.find((b) => b.id === q.id);
    assert.equal(q.respostaCorreta, original.resposta);
    assert.equal(q.explicacao, original.explicacao);
    assert.equal(q.enunciado, original.enunciado);
    assert.equal(q.segundos, secondsPlan[q.posicao - 1]);
  }
  assert.equal(r.questoes[8].situacao, 'incorreta');
  assert.equal(r.questoes[0].situacao, 'correta');
  assert.equal(r.questoes[6].imagem, 'assets/questoes-demo/serie.svg');
  assert.equal(r.acumulado.length, 10);
});

test('resultado não existe antes da finalização e não pode ser visto por outro usuário', async () => {
  const dono = await newUser();
  const { tentativaId } = (await dono.post('/api/tentativas')).json;
  assert.equal((await dono.get(`/api/tentativas/${tentativaId}/resultado`)).status, 409);
  const outro = await newUser();
  assert.equal((await outro.get(`/api/tentativas/${tentativaId}/resultado`)).status, 404);
  assert.equal((await outro.post(`/api/tentativas/${tentativaId}/apresentar`)).status, 404);
  assert.equal((await outro.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: 1, alternativa: 'A' })).status, 404);
});

test('iniciar de novo retoma a tentativa em andamento (sem perder respostas)', async () => {
  const c = await newUser();
  const first = (await c.post('/api/tentativas')).json;
  const q = await presentQuestion(c, first.tentativaId);
  await c.post(`/api/tentativas/${first.tentativaId}/respostas`, { questaoId: q.questao.id, alternativa: 'A' });
  assert.equal((await c.get('/api/tentativas/atual')).json.tentativaId, first.tentativaId);
  const again = (await c.post('/api/tentativas')).json;
  assert.equal(again.tentativaId, first.tentativaId);
  assert.equal(again.retomada, true);
  const progress = (await c.get(`/api/tentativas/${first.tentativaId}/progresso`)).json;
  assert.equal(progress.respondidas, 1);
  assert.equal(progress.posicao, 2);
});

test('encerrar antes do fim: questões restantes contam como não respondidas', async () => {
  const c = await newUser();
  const { tentativaId } = (await c.post('/api/tentativas')).json;
  for (let pos = 1; pos <= 3; pos += 1) {
    const s = await presentQuestion(c, tentativaId);
    srv.clock.advance(10000);
    await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: s.questao.id, alternativa: KEY[s.questao.id] });
  }
  assert.equal((await c.post(`/api/tentativas/${tentativaId}/finalizar`)).status, 200);
  const r = (await c.get(`/api/tentativas/${tentativaId}/resultado`)).json;
  assert.equal(r.tentativa.status, 'encerrada');
  assert.equal(r.resumo.acertos, 3);
  assert.equal(r.resumo.naoRespondidas, 7);
  assert.equal(r.resumo.aproveitamento, 30);
  assert.equal(r.questoes[5].situacao, 'nao_respondida');
  assert.equal((await c.post(`/api/tentativas/${tentativaId}/respostas`, { questaoId: 4, alternativa: 'A' })).status, 409);
});

test('histórico persiste após sair da conta e entrar de novo, sem misturar tentativas', async () => {
  const c = await newUser();
  const email = `aluno${seq}@example.com`;
  const a1 = await runAttempt(c, (pos, q) => ({ letra: KEY[q.id], segundos: 5 }));
  const a2 = await runAttempt(c, (pos, q) => ({ letra: wrongOf(KEY[q.id]), segundos: 7 }));
  await c.post('/api/auth/logout');
  const login = await c.post('/api/auth/login', { email, password: 'segura123' });
  assert.equal(login.status, 200);
  const hist = (await c.get('/api/tentativas')).json.tentativas;
  assert.deepEqual(hist.map((h) => h.id), [a2, a1]);
  assert.deepEqual(hist.map((h) => h.pontuacao), [0, 100]);
  const r1 = (await c.get(`/api/tentativas/${a1}/resultado`)).json;
  assert.ok(r1.questoes.every((q) => q.segundos === 5));
  assert.equal(r1.tentativa.versaoBanco, BANK.versao);
});

test('sem banco de questões instalado o teste não inicia e nenhuma questão é inventada', async () => {
  const empty = await startServer({ bankFile: '/caminho/inexistente/questoes.json' });
  try {
    const c = await registeredClient(empty.base, { email: 'semBanco@example.com' });
    const info = (await c.get('/api/teste/info')).json;
    assert.equal(info.bancoInstalado, false);
    const res = await c.post('/api/tentativas');
    assert.equal(res.status, 503);
    assert.equal(res.json.erro, 'banco_nao_instalado');
  } finally {
    await empty.close();
  }
});
