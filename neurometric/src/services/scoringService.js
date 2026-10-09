/**
 * Cálculo dos resultados (executado somente no servidor).
 *
 * Pontuação de desempenho:   S = 100 × (Σ P_obtido / Σ P_máximo)
 * Com peso 1 em todas as questões, isso equivale a:  S = (acertos / total) × 100
 * Ex.: 8 acertos em 10 questões → S = 80.
 *
 * Questões não respondidas valem 0 ponto. O tempo é registrado e exibido,
 * mas NÃO altera a pontuação (não há bônus de rapidez nesta versão).
 */
const fs = require('node:fs');

const round = (value, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

/**
 * @param {Array} questions linhas da tabela questions (ordenadas por posição)
 * @param {Array} answers   linhas da tabela answers da tentativa
 * @param {{startedAt:number|null, finishedAt:number}} times
 */
function scoreAttempt(questions, answers, { startedAt, finishedAt }) {
  const byQuestion = new Map(answers.map((a) => [a.question_id, a]));
  const categories = new Map();
  let points = 0;
  let maxPoints = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  const timed = [];
  const cumulative = [];

  const perQuestion = questions.map((q) => {
    const answer = byQuestion.get(q.id);
    const answered = Boolean(answer && answer.answered_at);
    const isCorrect = answered && answer.selected_letter === q.correct_letter;
    const weight = q.weight || 1;
    maxPoints += weight;
    if (isCorrect) { points += weight; correct += 1; } else if (answered) wrong += 1; else unanswered += 1;

    const seconds = answered ? answer.seconds : null;
    if (answered) timed.push({ position: q.position, id: q.id, seconds });

    const cat = categories.get(q.category) || { nome: q.category, total: 0, acertos: 0, erros: 0, naoRespondidas: 0, pontos: 0, maximo: 0, segundos: 0, respondidas: 0 };
    cat.total += 1;
    cat.maximo += weight;
    if (isCorrect) { cat.acertos += 1; cat.pontos += weight; } else if (answered) cat.erros += 1; else cat.naoRespondidas += 1;
    if (answered) { cat.segundos += seconds; cat.respondidas += 1; }
    categories.set(q.category, cat);

    cumulative.push({ posicao: q.position, correta: answered ? isCorrect : null, acumulado: round((points / maxPoints) * 100) });

    return {
      questionId: q.id,
      position: q.position,
      category: q.category,
      selected: answered ? answer.selected_letter : null,
      correctLetter: q.correct_letter,
      status: answered ? (isCorrect ? 'correta' : 'incorreta') : 'nao_respondida',
      seconds,
    };
  });

  const answeredSeconds = timed.reduce((sum, t) => sum + t.seconds, 0);
  const fastest = timed.length ? timed.reduce((a, b) => (b.seconds < a.seconds ? b : a)) : null;
  const slowest = timed.length ? timed.reduce((a, b) => (b.seconds > a.seconds ? b : a)) : null;
  const totalSeconds = startedAt !== null && startedAt !== undefined ? Math.max(0, Math.round((finishedAt - startedAt) / 1000)) : 0;

  return {
    total: questions.length,
    correct,
    wrong,
    unanswered,
    points,
    maxPoints,
    score: maxPoints ? round((points / maxPoints) * 100) : 0,
    totalSeconds,
    avgSeconds: timed.length ? round(answeredSeconds / timed.length) : null,
    fastest,
    slowest,
    categories: [...categories.values()].map((c) => ({
      nome: c.nome,
      total: c.total,
      acertos: c.acertos,
      erros: c.erros,
      naoRespondidas: c.naoRespondidas,
      pontos: c.pontos,
      maximo: c.maximo,
      normalizado: c.maximo ? round((c.pontos / c.maximo) * 100) : 0,
      precisao: c.total ? round((c.acertos / c.total) * 100, 0) : 0,
      segundos: c.segundos,
      mediaSegundos: c.respondidas ? round(c.segundos / c.respondidas) : null,
    })),
    cumulative,
    perQuestion,
  };
}

/**
 * Estimativa EXPERIMENTAL de QI:  QI = 100 + 15 × ((S − μ) / σ)
 * μ e σ precisam vir de uma amostra normativa real (data/normas.json).
 * Sem amostra válida, nenhum número é inventado: o status fica "indisponivel".
 */
const MIN_NORMATIVE_SAMPLE = 100;

function loadNorms(file) {
  try {
    if (!file || !fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function estimateIq(score, norms) {
  if (!norms) {
    return { status: 'indisponivel', motivo: 'Ainda não existe uma amostra normativa válida para converter a pontuação em QI.' };
  }
  const { media: mu, desvioPadrao: sigma, tamanhoAmostra: n, fonte } = norms;
  if (!(typeof mu === 'number' && typeof sigma === 'number' && sigma > 0 && Number.isInteger(n) && n >= MIN_NORMATIVE_SAMPLE && fonte)) {
    return { status: 'indisponivel', motivo: `A amostra normativa precisa de média, desvio-padrão, fonte e pelo menos ${MIN_NORMATIVE_SAMPLE} participantes.` };
  }
  return {
    status: 'experimental',
    valor: Math.round(100 + 15 * ((score - mu) / sigma)),
    motivo: `Estimativa experimental baseada em amostra de ${n} participantes (${fonte}). Não é um QI clinicamente validado.`,
  };
}

module.exports = { scoreAttempt, estimateIq, loadNorms, MIN_NORMATIVE_SAMPLE };
