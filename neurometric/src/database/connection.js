/**
 * Conexão com o SQLite usando o módulo nativo `node:sqlite` (Node.js 22.13+).
 * Não exige compilação de dependências nativas, o que facilita rodar no Windows.
 */
const fs = require('node:fs');
const path = require('node:path');

// O módulo node:sqlite ainda emite um aviso "experimental"; silenciamos só esse aviso.
const originalEmit = process.emitWarning;
process.emitWarning = function patchedEmitWarning(warning, ...args) {
  const text = typeof warning === 'string' ? warning : warning && warning.message;
  if (text && text.includes('SQLite is an experimental feature')) return;
  return originalEmit.call(process, warning, ...args);
};
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

/** Abre (ou cria) o banco e aplica o esquema. */
function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  return db;
}

/**
 * Executa `fn` dentro de uma transação. Se qualquer instrução falhar,
 * tudo é desfeito (ROLLBACK), evitando respostas ou resultados pela metade.
 */
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { openDatabase, transaction };
