/**
 * Padrões para ambiente serverless (Vercel).
 *
 * Na Vercel o disco é só-leitura (exceto /tmp) e o banco real
 * (data/questoes.json) não é publicado. Sem estes padrões, o boot
 * tenta abrir data/neurometric.sqlite para escrita e a função quebra
 * com 500 antes de atender qualquer rota.
 *
 * Deve ser chamado ANTES de carregar ./config, pois o config lê as
 * variáveis de ambiente no momento do require.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function applyServerlessDefaults() {
  if (!process.env.VERCEL) return;
  if (!process.env.DATABASE_FILE) {
    process.env.DATABASE_FILE = '/tmp/neurometric.sqlite';
  }
  if (!process.env.QUESTION_BANK_FILE) {
    const real = path.join(ROOT_DIR, 'data', 'questoes.json');
    process.env.QUESTION_BANK_FILE = fs.existsSync(real)
      ? real
      : path.join(ROOT_DIR, 'tests', 'fixtures', 'banco-ficticio.json');
  }
}

module.exports = { applyServerlessDefaults };
