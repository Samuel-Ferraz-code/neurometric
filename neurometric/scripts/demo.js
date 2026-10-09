#!/usr/bin/env node
/**
 * Sobe o servidor em MODO DEMONSTRAÇÃO, usando o banco FICTÍCIO de testes
 * (tests/fixtures/banco-ficticio.json) e um banco SQLite separado (data/demo.sqlite).
 *
 * Serve para navegar pelo site antes de instalar o banco real (data/questoes.json).
 * As questões do modo demonstração são marcadas com [FICTÍCIA] e não fazem parte do documento original.
 *
 *   npm run demo
 */
const path = require('node:path');

const root = path.resolve(__dirname, '..');
process.env.QUESTION_BANK_FILE = path.join(root, 'tests', 'fixtures', 'banco-ficticio.json');
process.env.DATABASE_FILE = path.join(root, 'data', 'demo.sqlite');
process.env.MEMORIZATION_SECONDS = process.env.MEMORIZATION_SECONDS || '5';

console.log('\n  *** MODO DEMONSTRAÇÃO: banco de questões FICTÍCIO (não é o banco real) ***');
require('../src/server');
