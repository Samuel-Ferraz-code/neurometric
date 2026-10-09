/**
 * Motor da avaliação: tentativas, apresentação das questões, memorização,
 * cronômetros (baseados em horários do servidor), respostas e finalização.
 *
 * POLÍTICA DE TEMPO (documentada também no README):
 * - Cronômetro geral: começa quando a 1ª questão é apresentada e para quando a última é confirmada.
 * - Cronômetro da questão: começa quando a questão é apresentada (após a tela de memorização, se houver)
 *   e para quando a resposta é confirmada.
 * - Os dois contam tempo corrido, inclusive se o navegador for fechado ou a página atualizada.
 * - Não há limite de tempo nem cronômetro regressivo; o navegador só exibe o que o servidor registrou.
 * - Respostas em branco: o participante pode encerrar a avaliação antes do fim; as questões restantes
 *   ficam como "não respondidas" e valem 0 ponto.
 */
const { transaction } = require('../database/connection');
const { toPublicQuestion, LETTERS } = require('./questionBankService');
const { scoreAttempt, estimateIq } = require('./scoringService');
const { badRequest, conflict, notFound, unavailable } = require('../utils/httpError');

function createAttemptService({ db, questions, clock, getActiveVersion, getNorms = () => null }) {
  const q = {
    activeForUser: db.prepare("SELECT * FROM attempts WHERE user_id = ? AND status = 'em_andamento' ORDER BY id DESC LIMIT 1"),
    byId: db.prepare('SELECT * FROM attempts WHERE id = ?'),
    insert: db.prepare("INSERT INTO attempts (user_id, bank_version, status, current_position, total_questions, created_at) VALUES (?, ?, 'em_andamento', 1, ?, ?)"),
    setStarted: db.prepare('UPDATE attempts SET started_at = ? WHERE id = ? AND started_at IS NULL'),
    advance: db.prepare('UPDATE attempts SET current_position = current_position + 1 WHERE id = ?'),
    finish: db.prepare('UPDATE attempts SET status = ?, finished_at = ?, total_seconds = ? WHERE id = ?'),
    answer: db.prepare('SELECT * FROM answers WHERE attempt_id = ? AND question_id = ?'),
    answers: db.prepare('SELECT * FROM answers WHERE attempt_id = ? ORDER BY position'),
    insertAnswer: db.prepare('INSERT INTO answers (attempt_id, question_id, position, presented_at) VALUES (?, ?, ?, ?)'),
    saveAnswer: db.prepare('UPDATE answers SET answered_at = ?, selected_letter = ?, is_correct = ?, seconds = ? WHERE id = ? AND answered_at IS NULL'),
    memoView: db.prepare('SELECT * FROM memo_views WHERE attempt_id = ? AND question_id = ?'),
    insertMemo: db.prepare('INSERT INTO memo_views (attempt_id, question_id, shown_at, ends_at) VALUES (?, ?, ?, ?)'),
    insertResult: db.prepare(`INSERT INTO results (attempt_id, bank_version, total, correct, wrong, unanswered, points, max_points, score,
      total_seconds, avg_seconds, fastest_question, slowest_question, answer_key_json, computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    result: db.prepare('SELECT * FROM results WHERE attempt_id = ?'),
    history: db.prepare(`SELECT a.id, a.status, a.bank_version, a.created_at, a.started_at, a.finished_at, a.total_seconds,
      a.total_questions, a.current_position, r.correct, r.wrong, r.unanswered, r.score
      FROM attempts a LEFT JOIN results r ON r.attempt_id = a.id WHERE a.user_id = ? ORDER BY a.id DESC`),
    ordinal: db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND id <= ?'),
  };

  function requireBank() {
    const version = getActiveVersion();
    if (!version) throw unavailable('banco_nao_instalado', 'O banco de questões ainda não foi instalado no servidor (data/questoes.json).');
    return version;
  }

  /** Garante que a tentativa existe e pertence ao usuário logado. */
  function ownedAttempt(userId, attemptId) {
    const attempt = q.byId.get(Number(attemptId));
    if (!attempt || attempt.user_id !== userId) throw notFound('Tentativa não encontrada.');
    return attempt;
  }

  function info() {
    const version = getActiveVersion();
    if (!version) return { bancoInstalado: false, total: 0, categorias: [], limiteDeTempo: null };
    const rows = questions.all(version);
    return {
      bancoInstalado: true,
      versao: version,
      total: rows.length,
      categorias: [...new Set(rows.map((r) => r.category))],
      limiteDeTempo: null,
    };
  }

  /** Inicia uma nova tentativa ou retoma a que está em andamento. */
  function startOrResume(userId) {
    const active = q.activeForUser.get(userId);
    if (active) return { tentativaId: active.id, retomada: true };
    const version = requireBank();
    const total = questions.all(version).length;
    const info = q.insert.run(userId, version, total, clock.now());
    return { tentativaId: Number(info.lastInsertRowid), retomada: false };
  }

  function activeAttempt(userId) {
    const active = q.activeForUser.get(userId);
    return active ? { tentativaId: active.id } : null;
  }

  /**
   * Apresenta a etapa atual: a tela de memorização (se houver sequência a exibir antes
   * desta posição) ou a própria questão. É idempotente: chamar de novo após atualizar a
   * página devolve o mesmo estado, com os mesmos horários de início.
   */
  function present(userId, attemptId) {
    return transaction(db, () => {
      const attempt = ownedAttempt(userId, attemptId);
      if (attempt.status !== 'em_andamento') throw conflict('Esta tentativa já foi finalizada.');
      const now = clock.now();
      const question = questions.atPosition(attempt.bank_version, attempt.current_position);
      if (!question) throw conflict('Não há questão pendente nesta tentativa.');

      const base = {
        tentativaId: attempt.id,
        status: attempt.status,
        posicao: attempt.current_position,
        total: attempt.total_questions,
        respondidas: attempt.current_position - 1,
        servidorAgora: now,
      };

      let answer = q.answer.get(attempt.id, question.id);
      if (!answer) {
        // Sequências de memorização que devem aparecer antes desta posição.
        let availableAt = null;
        for (const memoQuestion of questions.memosBefore(attempt.bank_version, attempt.current_position)) {
          let view = q.memoView.get(attempt.id, memoQuestion.id);
          if (!view) {
            q.insertMemo.run(attempt.id, memoQuestion.id, now, now + memoQuestion.memo_duration_ms);
            view = q.memoView.get(attempt.id, memoQuestion.id);
          }
          if (view.ends_at > now) {
            return {
              ...base,
              fase: 'memorizacao',
              inicioGeral: attempt.started_at,
              memorizacao: {
                sequencia: memoQuestion.memo_sequence,
                duracaoMs: view.ends_at - view.shown_at,
                terminaEm: view.ends_at,
              },
            };
          }
          availableAt = Math.max(availableAt || 0, view.ends_at);
        }
        // A questão começa a contar quando fica disponível: no fim da memorização, ou agora.
        const presentedAt = availableAt !== null ? Math.min(availableAt, now) : now;
        q.insertAnswer.run(attempt.id, question.id, question.position, presentedAt);
        q.setStarted.run(presentedAt, attempt.id);
        answer = q.answer.get(attempt.id, question.id);
      }

      const fresh = q.byId.get(attempt.id);
      return {
        ...base,
        fase: 'questao',
        inicioGeral: fresh.started_at,
        inicioQuestao: answer.presented_at,
        questao: toPublicQuestion(question),
      };
    });
  }

  /** Progresso sem expor conteúdo de questões. */
  function progress(userId, attemptId) {
    const attempt = ownedAttempt(userId, attemptId);
    const answered = q.answers.all(attempt.id).filter((a) => a.answered_at).length;
    return {
      tentativaId: attempt.id,
      status: attempt.status,
      posicao: attempt.current_position,
      total: attempt.total_questions,
      respondidas: answered,
      percentual: Math.round((answered / attempt.total_questions) * 100),
      inicioGeral: attempt.started_at,
      servidorAgora: clock.now(),
    };
  }

  /** Registra a resposta da questão atual, corrige no servidor e avança. */
  function answer(userId, attemptId, body = {}) {
    const letter = typeof body.alternativa === 'string' ? body.alternativa.trim().toUpperCase() : '';
    const questionId = Number(body.questaoId);
    if (!LETTERS.includes(letter)) throw badRequest('Selecione uma alternativa de A a E.');
    if (!Number.isInteger(questionId)) throw badRequest('Questão inválida.');

    return transaction(db, () => {
      const attempt = ownedAttempt(userId, attemptId);
      if (attempt.status !== 'em_andamento') throw conflict('Esta tentativa já foi finalizada.');
      const question = questions.atPosition(attempt.bank_version, attempt.current_position);
      if (!question || question.id !== questionId) throw conflict('Esta questão já foi respondida ou não é a questão atual.');
      const row = q.answer.get(attempt.id, question.id);
      if (!row) throw conflict('A questão ainda não foi apresentada.');
      if (row.answered_at) throw conflict('Esta questão já foi respondida.');

      const now = clock.now();
      const seconds = Math.max(0, Math.round((now - row.presented_at) / 1000));
      const changed = q.saveAnswer.run(now, letter, letter === question.correct_letter ? 1 : 0, seconds, row.id);
      if (Number(changed.changes) !== 1) throw conflict('Esta questão já foi respondida.');
      q.advance.run(attempt.id);

      const finished = attempt.current_position >= attempt.total_questions;
      if (finished) finalizeInTransaction(q.byId.get(attempt.id), now, 'finalizada');
      // A correção NÃO é devolvida aqui: o resultado só aparece após a finalização.
      return { tentativaId: attempt.id, registrada: true, segundos: seconds, finalizada: finished };
    });
  }

  /** Encerra antes do fim: as questões restantes contam como não respondidas. */
  function finishEarly(userId, attemptId) {
    return transaction(db, () => {
      const attempt = ownedAttempt(userId, attemptId);
      if (attempt.status !== 'em_andamento') throw conflict('Esta tentativa já foi finalizada.');
      finalizeInTransaction(attempt, clock.now(), 'encerrada');
      return { tentativaId: attempt.id, finalizada: true };
    });
  }

  function finalizeInTransaction(attempt, now, status) {
    const rows = questions.all(attempt.bank_version);
    const answers = q.answers.all(attempt.id);
    const lastAnswer = answers.reduce((max, a) => Math.max(max, a.answered_at || 0), 0);
    const finishedAt = status === 'finalizada' ? lastAnswer || now : now;
    const score = scoreAttempt(rows, answers, { startedAt: attempt.started_at, finishedAt });
    const answerKey = Object.fromEntries(rows.map((r) => [r.id, r.correct_letter]));
    q.insertResult.run(
      attempt.id, attempt.bank_version, score.total, score.correct, score.wrong, score.unanswered,
      score.points, score.maxPoints, score.score, score.totalSeconds, score.avgSeconds,
      score.fastest ? score.fastest.position : null, score.slowest ? score.slowest.position : null,
      JSON.stringify(answerKey), now,
    );
    q.finish.run(status, finishedAt, score.totalSeconds, attempt.id);
  }

  /** Resultado completo, com gabarito e explicações (somente após a finalização). */
  function result(userId, attemptId) {
    const attempt = ownedAttempt(userId, attemptId);
    if (attempt.status === 'em_andamento') throw conflict('A avaliação ainda não foi finalizada.');
    const saved = q.result.get(attempt.id);
    const rows = questions.all(attempt.bank_version);
    const answers = q.answers.all(attempt.id);
    const score = scoreAttempt(rows, answers, { startedAt: attempt.started_at, finishedAt: attempt.finished_at });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const answerKey = JSON.parse(saved.answer_key_json);

    return {
      tentativa: {
        id: attempt.id,
        numero: q.ordinal.get(userId, attempt.id).n,
        status: attempt.status,
        versaoBanco: attempt.bank_version,
        criadaEm: attempt.created_at,
        inicio: attempt.started_at,
        fim: attempt.finished_at,
      },
      resumo: {
        total: saved.total,
        acertos: saved.correct,
        erros: saved.wrong,
        naoRespondidas: saved.unanswered,
        pontos: saved.points,
        pontosMaximos: saved.max_points,
        pontuacao: saved.score,
        aproveitamento: saved.score,
        tempoTotalSegundos: saved.total_seconds,
        tempoMedioSegundos: saved.avg_seconds,
        questaoMaisRapida: score.fastest,
        questaoMaisDemorada: score.slowest,
      },
      qi: estimateIq(saved.score, getNorms()),
      categorias: score.categories,
      acumulado: score.cumulative,
      questoes: score.perQuestion.map((p) => {
        const row = byId.get(p.questionId);
        return {
          id: p.questionId,
          posicao: p.position,
          categoria: p.category,
          enunciado: row.statement,
          imagem: row.image,
          alternativas: JSON.parse(row.options_json),
          memorizacao: row.memo_sequence ? { sequencia: row.memo_sequence } : null,
          respostaUsuario: p.selected,
          respostaCorreta: answerKey[p.questionId] || p.correctLetter,
          situacao: p.status,
          segundos: p.seconds,
          explicacao: row.explanation,
        };
      }),
    };
  }

  function history(userId) {
    return q.history.all(userId).map((h, index, list) => ({
      id: h.id,
      numero: list.length - index,
      status: h.status,
      versaoBanco: h.bank_version,
      criadaEm: h.created_at,
      inicio: h.started_at,
      fim: h.finished_at,
      tempoTotalSegundos: h.total_seconds,
      total: h.total_questions,
      acertos: h.correct,
      erros: h.wrong,
      naoRespondidas: h.unanswered,
      pontuacao: h.score,
    }));
  }

  return { info, startOrResume, activeAttempt, present, progress, answer, finishEarly, result, history };
}

module.exports = { createAttemptService };
