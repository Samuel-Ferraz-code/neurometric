/** Testes do serviço de pontuação e da estimativa experimental de QI. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreAttempt, estimateIq } = require('../src/services/scoringService');

const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, position: i + 1, category: i < 5 ? 'Lógica' : 'Memória', correct_letter: 'A', weight: 1,
}));
const answer = (id, letter, seconds) => ({ question_id: id, answered_at: 1, selected_letter: letter, seconds });

test('S = (acertos / 10) × 100 para todas as quantidades de acertos', () => {
  for (let hits = 0; hits <= 10; hits += 1) {
    const answers = questions.map((q) => answer(q.id, q.id <= hits ? 'A' : 'B', 10));
    const s = scoreAttempt(questions, answers, { startedAt: 0, finishedAt: 100000 });
    assert.equal(s.correct, hits);
    assert.equal(s.wrong, 10 - hits);
    assert.equal(s.score, hits * 10);
  }
});

test('não respondidas valem zero e não entram no tempo médio', () => {
  const answers = [answer(1, 'A', 20), answer(2, 'B', 40)];
  const s = scoreAttempt(questions, answers, { startedAt: 0, finishedAt: 90000 });
  assert.equal(s.unanswered, 8);
  assert.equal(s.score, 10);
  assert.equal(s.avgSeconds, 30);
  assert.equal(s.totalSeconds, 90);
});

test('pontuação ponderada segue S = 100 × ΣP_obtido / ΣP_máximo', () => {
  const weighted = questions.map((q) => ({ ...q, weight: q.id === 1 ? 3 : 1 }));
  const answers = [answer(1, 'A', 5), ...questions.slice(1).map((q) => answer(q.id, 'B', 5))];
  const s = scoreAttempt(weighted, answers, { startedAt: 0, finishedAt: 50000 });
  assert.equal(s.points, 3);
  assert.equal(s.maxPoints, 12);
  assert.equal(s.score, 25);
});

test('desempenho por categoria e série acumulada', () => {
  const answers = questions.map((q) => answer(q.id, q.id % 2 ? 'A' : 'B', q.id));
  const s = scoreAttempt(questions, answers, { startedAt: 0, finishedAt: 1 });
  const logica = s.categories.find((c) => c.nome === 'Lógica');
  assert.deepEqual([logica.total, logica.acertos, logica.erros, logica.normalizado], [5, 3, 2, 60]);
  assert.equal(s.cumulative[0].acumulado, 100);
  assert.equal(s.cumulative[1].acumulado, 50);
  assert.equal(s.cumulative[9].acumulado, 50);
  assert.equal(s.fastest.position, 1);
  assert.equal(s.slowest.position, 10);
});

test('QI fica indisponível sem amostra normativa; nenhum μ ou σ é inventado', () => {
  assert.equal(estimateIq(80, null).status, 'indisponivel');
  assert.equal(estimateIq(80, { media: 60, desvioPadrao: 10, tamanhoAmostra: 12, fonte: 'piloto' }).status, 'indisponivel');
  assert.equal(estimateIq(80, { media: 60, desvioPadrao: 0, tamanhoAmostra: 500, fonte: 'x' }).status, 'indisponivel');
});

test('com amostra normativa válida, QI = 100 + 15 × ((S − μ) / σ), marcado como experimental', () => {
  const iq = estimateIq(80, { media: 60, desvioPadrao: 10, tamanhoAmostra: 500, fonte: 'Amostra de validação' });
  assert.equal(iq.status, 'experimental');
  assert.equal(iq.valor, 130);
  assert.match(iq.motivo, /Não é um QI clinicamente validado/);
});
