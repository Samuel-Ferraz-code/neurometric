/** Testes do banco de questões: estrutura, validação e importação. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateBank, importBank, readBankFile } = require('../src/services/questionBankService');
const { openDatabase } = require('../src/database/connection');
const { FIXTURE_BANK } = require('./helpers');

const publicDir = path.join(__dirname, '..', 'public');
const load = () => JSON.parse(fs.readFileSync(FIXTURE_BANK, 'utf8'));

test('banco fictício de testes é válido: 10 questões, 5 alternativas cada, ordem 1..10', () => {
  const bank = load();
  const report = validateBank(bank, { publicDir });
  assert.deepEqual(report.errors, []);
  assert.equal(bank.questoes.length, 10);
  for (const q of bank.questoes) assert.equal(q.alternativas.length, 5);
  assert.deepEqual(bank.questoes.map((q) => q.ordem), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('validação recusa banco com quantidade diferente de 10', () => {
  const bank = load();
  bank.questoes.pop();
  const report = validateBank(bank, { publicDir });
  assert.equal(report.ok, false);
  assert.match(report.errors.join(' '), /exatamente 10/);
});

test('validação aponta id repetido, alternativa faltando, gabarito inválido e imagem inexistente', () => {
  const bank = load();
  bank.questoes[1].id = bank.questoes[0].id;
  bank.questoes[2].alternativas.pop();
  bank.questoes[3].resposta = 'F';
  bank.questoes[6].imagem = 'assets/questoes/nao-existe.png';
  const report = validateBank(bank, { publicDir });
  const all = report.errors.join('\n');
  assert.match(all, /id repetido/);
  assert.match(all, /exatamente 5 alternativas/);
  assert.match(all, /letra de A a E/);
  assert.match(all, /imagem não encontrada/);
});

test('validação recusa imagens externas e memorização exibida depois da própria questão', () => {
  const bank = load();
  bank.questoes[6].imagem = 'https://exemplo.com/figura.png';
  bank.questoes[5].memorizacao.exibir_antes_da_questao = 9;
  const report = validateBank(bank, { publicDir });
  assert.match(report.errors.join('\n'), /imagens locais/);
  assert.match(report.errors.join('\n'), /exibir_antes_da_questao/);
});

test('importação grava as 10 questões e não reimporta a mesma versão', () => {
  const db = openDatabase(':memory:');
  const { bank, hash } = readBankFile(FIXTURE_BANK);
  const first = importBank(db, { bank, hash, now: 1, publicDir, memorizationMs: 8000 });
  assert.equal(first.imported, true);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n, 10);
  const second = importBank(db, { bank, hash, now: 2, publicDir, memorizationMs: 8000 });
  assert.equal(second.alreadyPresent, true);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n, 10);
});

test('mesma versão com conteúdo alterado é recusada (protege o histórico e o gabarito usado)', () => {
  const db = openDatabase(':memory:');
  const { bank, hash } = readBankFile(FIXTURE_BANK);
  importBank(db, { bank, hash, now: 1, publicDir, memorizationMs: 8000 });
  const changed = importBank(db, { bank, hash: 'outro-hash', now: 2, publicDir, memorizationMs: 8000 });
  assert.equal(changed.imported, false);
  assert.match(changed.report.errors.join(' '), /outro conteúdo/);
});

test('nenhuma página ou script ativo menciona o teste antigo de 60 questões ou o banco de 300', () => {
  const pub = path.join(__dirname, '..', 'public');
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(html|js)$/.test(e.name)) files.push(p);
  });
  walk(pub);
  assert.ok(files.length > 0);
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /60 quest|300 quest|banco_300|Q60/i, `referência antiga em ${path.relative(pub, f)}`);
  }
});
