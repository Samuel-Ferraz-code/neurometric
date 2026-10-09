#!/usr/bin/env node
/**
 * Valida o banco de questões e gera um relatório (sem alterar o arquivo original).
 *
 *   npm run validar-banco                       → valida data/questoes.json
 *   npm run validar-banco -- caminho/arquivo.json → valida outro arquivo
 *
 * O relatório também é salvo em docs/relatorio-validacao-banco.md.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/config');
const { validateBank, readBankFile } = require('../src/services/questionBankService');

const file = path.resolve(process.argv[2] || config.questionBankFile);
const out = path.join(config.rootDir, 'docs', 'relatorio-validacao-banco.md');
const lines = [`# Relatório de validação do banco de questões`, '', `- Arquivo: \`${path.relative(config.rootDir, file)}\``, `- Data: ${new Date().toLocaleString('pt-BR')}`, ''];

let exitCode = 0;
const loaded = (() => {
  try { return readBankFile(file); } catch (err) { lines.push(`**Erro ao ler o JSON:** ${err.message}`); exitCode = 1; return undefined; }
})();

if (loaded === null) {
  lines.push('**Arquivo não encontrado.** Veja data/LEIA-ME.md para o formato esperado.');
  exitCode = 1;
} else if (loaded) {
  const report = validateBank(loaded.bank, { publicDir: config.publicDir });
  const s = report.summary;
  if (s) {
    lines.push(`- Versão: \`${s.versao}\``, `- Total de questões: ${s.total}`, '', '## Questões por categoria', '', '| Categoria | Questões |', '|---|---:|');
    Object.entries(s.categorias).forEach(([c, n]) => lines.push(`| ${c} | ${n} |`));
    lines.push('');
  }
  lines.push('## Resultado', '', report.ok ? '**Banco válido.** Pode ser importado pelo servidor.' : `**Banco inválido: ${report.errors.length} problema(s).** O servidor não iniciará a avaliação até a correção.`, '');
  if (report.errors.length) { lines.push('### Erros', ''); report.errors.forEach((e) => lines.push(`- ${e}`)); lines.push(''); }
  if (report.warnings.length) { lines.push('### Avisos', ''); report.warnings.forEach((w) => lines.push(`- ${w}`)); lines.push(''); }
  if (!report.ok) exitCode = 1;
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nRelatório salvo em ${path.relative(config.rootDir, out)}`);
process.exit(exitCode);
