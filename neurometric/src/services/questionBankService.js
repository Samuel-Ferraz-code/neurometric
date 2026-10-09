/**
 * Banco de questões: leitura, validação e importação para o SQLite.
 *
 * O arquivo de origem é data/questoes.json, convertido do documento
 * "Questões Qi_so10.docx". O conteúdo nunca é alterado por este serviço:
 * se algo estiver inconsistente, a importação é recusada e um relatório é gerado.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { transaction } = require('../database/connection');

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const EXPECTED_TOTAL = 10;

/** Valida a estrutura do JSON. Retorna { ok, errors, warnings, summary }. */
function validateBank(bank, { publicDir, expectedTotal = EXPECTED_TOTAL } = {}) {
  const errors = [];
  const warnings = [];
  const push = (list, where, msg) => list.push(`${where}: ${msg}`);

  if (!bank || typeof bank !== 'object') {
    return { ok: false, errors: ['O arquivo não contém um objeto JSON.'], warnings, summary: null };
  }
  if (typeof bank.versao !== 'string' || !bank.versao.trim()) push(errors, 'banco', 'campo "versao" ausente.');
  if (!Array.isArray(bank.questoes)) {
    errors.push('banco: campo "questoes" deve ser uma lista.');
    return { ok: false, errors, warnings, summary: null };
  }
  if (bank.questoes.length !== expectedTotal) {
    push(errors, 'banco', `esperadas exatamente ${expectedTotal} questões, encontradas ${bank.questoes.length}.`);
  }

  const ids = new Set();
  const orders = new Set();
  const categories = new Map();

  bank.questoes.forEach((q, index) => {
    const where = `questão #${index + 1}${q && q.id !== undefined ? ` (id ${q.id})` : ''}`;
    if (!q || typeof q !== 'object') return push(errors, where, 'registro inválido.');

    if (!Number.isInteger(q.id) || q.id < 1) push(errors, where, '"id" deve ser um inteiro positivo.');
    else if (ids.has(q.id)) push(errors, where, 'id repetido.');
    else ids.add(q.id);

    if (!Number.isInteger(q.ordem) || q.ordem < 1) push(errors, where, '"ordem" deve ser um inteiro positivo.');
    else if (orders.has(q.ordem)) push(errors, where, 'ordem repetida.');
    else orders.add(q.ordem);

    if (typeof q.enunciado !== 'string' || !q.enunciado.trim()) push(errors, where, 'enunciado vazio.');

    if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) {
      push(errors, where, 'devem existir exatamente 5 alternativas (A a E).');
    } else {
      q.alternativas.forEach((alt, i) => {
        if (!alt || alt.letra !== LETTERS[i]) push(errors, where, `alternativa ${i + 1} deveria ter a letra ${LETTERS[i]}.`);
        const hasText = alt && typeof alt.texto === 'string' && alt.texto.trim();
        const hasImage = alt && typeof alt.imagem === 'string' && alt.imagem.trim();
        if (!hasText && !hasImage) push(errors, where, `alternativa ${LETTERS[i]} sem texto e sem imagem.`);
        if (hasImage) checkImage(alt.imagem, `${where}, alternativa ${LETTERS[i]}`);
      });
    }

    if (!LETTERS.includes(q.resposta)) push(errors, where, '"resposta" deve ser uma letra de A a E.');
    if (typeof q.explicacao !== 'string' || !q.explicacao.trim()) push(warnings, where, 'sem explicação.');
    if (q.imagem) checkImage(q.imagem, `${where}, imagem do enunciado`);
    if (q.peso !== undefined && !(typeof q.peso === 'number' && q.peso > 0)) push(errors, where, '"peso" deve ser um número positivo.');

    if (q.memorizacao) {
      const m = q.memorizacao;
      if (typeof m.sequencia !== 'string' || !m.sequencia.trim()) push(errors, where, 'memorização sem sequência.');
      if (m.exibir_antes_da_questao !== undefined
        && (!Number.isInteger(m.exibir_antes_da_questao) || m.exibir_antes_da_questao > q.ordem)) {
        push(errors, where, '"exibir_antes_da_questao" deve ser uma posição anterior ou igual à própria questão.');
      }
      if (m.duracao_segundos !== undefined && !(Number.isInteger(m.duracao_segundos) && m.duracao_segundos > 0)) {
        push(errors, where, '"duracao_segundos" deve ser um inteiro positivo.');
      }
    }

    const cat = q.categoria || 'Geral';
    categories.set(cat, (categories.get(cat) || 0) + 1);
  });

  const sortedOrders = [...orders].sort((a, b) => a - b);
  if (sortedOrders.some((value, i) => value !== i + 1)) {
    push(errors, 'banco', 'a ordem das questões deve ser contínua, de 1 até o total.');
  }

  function checkImage(relPath, where) {
    if (/^(https?:)?\/\//i.test(relPath)) return push(errors, where, 'use imagens locais (public/assets/questoes), não URLs externas.');
    if (relPath.includes('..')) return push(errors, where, 'caminho de imagem inválido.');
    if (publicDir && !fs.existsSync(path.join(publicDir, relPath))) push(errors, where, `imagem não encontrada: public/${relPath}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: { versao: bank.versao, total: bank.questoes.length, categorias: Object.fromEntries(categories) },
  };
}

/** Lê o JSON do disco. Retorna null se o arquivo ainda não foi instalado. */
function readBankFile(file) {
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  return { bank: JSON.parse(raw), hash: crypto.createHash('sha256').update(raw).digest('hex') };
}

/**
 * Importa o banco para o SQLite. Cada versão é importada uma única vez;
 * se o conteúdo mudar sem trocar a "versao", a importação é recusada para
 * não misturar tentativas antigas com um gabarito diferente.
 */
function importBank(db, { bank, hash, source, now, publicDir, memorizationMs }) {
  const report = validateBank(bank, { publicDir });
  if (!report.ok) return { imported: false, report };

  const existing = db.prepare('SELECT * FROM question_banks WHERE version = ?').get(bank.versao);
  if (existing) {
    if (existing.content_hash !== hash) {
      report.ok = false;
      report.errors.push(`a versão "${bank.versao}" já foi importada com outro conteúdo. Altere o campo "versao" do JSON para registrar a nova versão.`);
      return { imported: false, report };
    }
    return { imported: false, alreadyPresent: true, report };
  }

  const insertQuestion = db.prepare(`
    INSERT INTO questions (bank_version, id, position, category, statement, image, options_json,
      correct_letter, explanation, weight, memo_sequence, memo_before_pos, memo_duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  transaction(db, () => {
    db.prepare('INSERT INTO question_banks (version, source, total, content_hash, imported_at) VALUES (?, ?, ?, ?, ?)')
      .run(bank.versao, source || bank.fonte || null, bank.questoes.length, hash, now);
    for (const q of bank.questoes) {
      const memo = q.memorizacao || null;
      insertQuestion.run(
        bank.versao, q.id, q.ordem, q.categoria || 'Geral', q.enunciado, q.imagem || null,
        JSON.stringify(q.alternativas.map((a) => ({ letra: a.letra, texto: a.texto || '', imagem: a.imagem || null }))),
        q.resposta, q.explicacao || '', q.peso || 1,
        memo ? memo.sequencia : null,
        memo ? (memo.exibir_antes_da_questao || q.ordem) : null,
        memo ? (memo.duracao_segundos ? memo.duracao_segundos * 1000 : memorizationMs) : null,
      );
    }
  });
  return { imported: true, report };
}

/** Repositório de leitura das questões já importadas. */
function createQuestionRepository(db) {
  const byPosition = db.prepare('SELECT * FROM questions WHERE bank_version = ? AND position = ?');
  const all = db.prepare('SELECT * FROM questions WHERE bank_version = ? ORDER BY position');
  const memosBefore = db.prepare('SELECT * FROM questions WHERE bank_version = ? AND memo_before_pos = ? ORDER BY position');
  const bankInfo = db.prepare('SELECT * FROM question_banks WHERE version = ?');
  return {
    atPosition: (version, position) => byPosition.get(version, position),
    all: (version) => all.all(version),
    memosBefore: (version, position) => memosBefore.all(version, position),
    bank: (version) => bankInfo.get(version),
  };
}

/** Versão da questão segura para o navegador: SEM gabarito e SEM explicação. */
function toPublicQuestion(row) {
  return {
    id: row.id,
    posicao: row.position,
    categoria: row.category,
    enunciado: row.statement,
    imagem: row.image,
    alternativas: JSON.parse(row.options_json),
  };
}

module.exports = { validateBank, readBankFile, importBank, createQuestionRepository, toPublicQuestion, LETTERS, EXPECTED_TOTAL };
