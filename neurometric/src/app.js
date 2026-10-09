/**
 * Montagem da aplicação Express: banco de dados, serviços, middlewares, API e páginas.
 * Exporta createApp() para que os testes automatizados possam criar instâncias isoladas.
 */
const path = require('node:path');
const express = require('express');

const defaultConfig = require('./config');
const { openDatabase } = require('./database/connection');
const { systemClock } = require('./utils/clock');
const { createUserRepository } = require('./repositories/userRepository');
const { createSessionRepository, createPasswordResetRepository, createLoginAttemptRepository } = require('./repositories/sessionRepository');
const { readBankFile, importBank, createQuestionRepository } = require('./services/questionBankService');
const { loadNorms } = require('./services/scoringService');
const { createAuthService } = require('./services/authService');
const { createAttemptService } = require('./services/attemptService');
const { createGoogleOAuthService } = require('./services/googleOAuthService');
const { createAuthController } = require('./controllers/authController');
const { createAttemptController } = require('./controllers/attemptController');
const { createApiRouter } = require('./routes');
const { securityHeaders, cookies, notFoundApi, errorHandler } = require('./middleware/http');
const { sessionMiddleware, requirePageAuth } = require('./middleware/auth');

/** Páginas que só podem ser abertas por usuários autenticados. */
const PRIVATE_PAGES = ['/teste.html', '/teste', '/resultado.html', '/resultado'];

function createApp(overrides = {}) {
  const config = { ...defaultConfig, ...overrides.config };
  const clock = overrides.clock || systemClock;
  const logger = overrides.logger || console;
  const db = overrides.db || openDatabase(config.databaseFile);

  // ---- Banco de questões --------------------------------------------------
  let activeVersion = null;
  let bankReport = null;
  const loaded = readBankFile(config.questionBankFile);
  if (!loaded) {
    bankReport = { ok: false, errors: [`Arquivo não encontrado: ${path.relative(config.rootDir, config.questionBankFile)}`], warnings: [] };
    logger.warn('[NeuroMetric] Banco de questões não instalado. Coloque o arquivo data/questoes.json (veja data/LEIA-ME.md).');
  } else {
    const out = importBank(db, {
      bank: loaded.bank,
      hash: loaded.hash,
      now: clock.now(),
      publicDir: config.publicDir,
      memorizationMs: config.test.memorizationMs,
    });
    bankReport = out.report;
    if (out.report.ok) activeVersion = loaded.bank.versao;
    else logger.error('[NeuroMetric] Banco de questões inválido. Rode "npm run validar-banco" para ver o relatório:\n - ' + out.report.errors.join('\n - '));
  }

  // ---- Serviços -----------------------------------------------------------
  const users = createUserRepository(db);
  const sessions = createSessionRepository(db);
  const authService = createAuthService({
    users,
    sessions,
    resets: createPasswordResetRepository(db),
    loginAttempts: createLoginAttemptRepository(db),
    clock,
    config,
    logger,
  });
  const questions = createQuestionRepository(db);
  const attemptService = createAttemptService({
    db,
    questions,
    clock,
    getActiveVersion: () => activeVersion,
    getNorms: () => loadNorms(config.normsFile),
  });
  const googleService = createGoogleOAuthService({ config, users, clock, fetchImpl: overrides.fetch });

  // ---- Express ------------------------------------------------------------
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(express.json({ limit: '20kb' }));
  app.use(cookies);
  app.use(sessionMiddleware({ authService, config }));

  app.use('/api', createApiRouter({
    authController: createAuthController({ authService, googleService, config }),
    attemptController: createAttemptController({ attemptService }),
  }));
  app.use('/api', notFoundApi);

  // Páginas privadas exigem sessão antes de servir o HTML.
  app.get(PRIVATE_PAGES, requirePageAuth);

  app.use(express.static(config.publicDir, { extensions: ['html'], index: 'index.html' }));
  app.use((req, res) => {
    const notFoundPage = path.join(config.publicDir, '404.html');
    if (require('node:fs').existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
    return res.status(404).json({ erro: 'nao_encontrado', mensagem: 'Página não encontrada.' });
  });
  app.use(errorHandler(logger));

  // Limpeza periódica de sessões expiradas.
  sessions.purgeExpired(clock.now());

  app.locals.db = db;
  app.locals.bankReport = bankReport;
  app.locals.services = { authService, attemptService };
  return app;
}

module.exports = { createApp };
