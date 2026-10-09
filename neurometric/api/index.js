/**
 * Adaptador serverless para a Vercel.
 * Exporta o app Express SEM chamar app.listen().
 * Na Vercel o disco e so-leitura (exceto /tmp) e nao ha data/questoes.json,
 * entao usa SQLite em /tmp e o banco FICTICIO de demonstracao como fallback.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

if (process.env.VERCEL && !process.env.DATABASE_FILE) {
  process.env.DATABASE_FILE = '/tmp/neurometric.sqlite';
}

function resolveBank() {
  if (process.env.QUESTION_BANK_FILE) return process.env.QUESTION_BANK_FILE;
  const real = path.join(ROOT, 'data', 'questoes.json');
  if (fs.existsSync(real)) return real;
  return path.join(ROOT, 'tests', 'fixtures', 'banco-ficticio.json');
}

if (!process.env.QUESTION_BANK_FILE) {
  process.env.QUESTION_BANK_FILE = resolveBank();
}

const { createApp } = require('../src/app');

let cached = null;
let bootError = null;
function getApp() {
  if (!cached && !bootError) {
    try {
      cached = createApp();
    } catch (err) {
      bootError = err;
      console.error('[NeuroMetric] Falha no boot:', err && err.stack || err);
    }
  }
  return cached;
}

module.exports = (req, res) => {
  const app = getApp();
  if (!app) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ erro: 'boot_falhou', mensagem: String((bootError && bootError.message) || bootError) }));
    return;
  }
  return app(req, res);
};
