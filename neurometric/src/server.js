/**
 * Ponto de entrada do servidor NeuroMetric.
 *   npm run dev   → reinicia sozinho ao salvar arquivos (node --watch)
 *   npm start     → execução normal
 */
const config = require('./config');
const { createApp } = require('./app');
const { algorithmInUse } = require('./services/passwordService');

const app = createApp();

app.listen(config.port, () => {
  const report = app.locals.bankReport;
  console.log(`\n  NeuroMetric rodando em ${config.baseUrl}`);
  console.log(`  Banco de questões: ${report && report.ok ? `${report.summary.total} questões (versão ${report.summary.versao})` : 'NÃO INSTALADO — veja data/LEIA-ME.md'}`);
  console.log(`  Hash de senhas: ${algorithmInUse()}`);
  console.log(`  Login com Google: ${config.google.enabled ? 'ativado' : 'desativado (configure o .env)'}\n`);
});
