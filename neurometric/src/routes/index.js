/**
 * Rotas da API REST do NeuroMetric.
 *
 * Públicas:
 *   POST /api/auth/cadastro            cria conta e inicia sessão
 *   POST /api/auth/login               autentica (com limite de tentativas)
 *   POST /api/auth/esqueci-senha       gera token temporário de redefinição
 *   POST /api/auth/redefinir-senha     troca a senha usando o token
 *   GET  /api/auth/config              informa se o login com Google está ativo
 *   GET  /api/auth/sessao              usuário da sessão atual ou null
 *   GET  /api/auth/google              inicia o OAuth do Google (se configurado)
 *   GET  /api/auth/google/callback     retorno do Google
 *   GET  /api/teste/info               quantidade de questões e categorias (sem conteúdo)
 *
 * Privadas (exigem sessão):
 *   GET  /api/auth/me                       usuário autenticado
 *   POST /api/auth/logout                   encerra a sessão
 *   POST /api/tentativas                    inicia ou retoma a avaliação
 *   GET  /api/tentativas                    histórico de tentativas
 *   GET  /api/tentativas/atual              tentativa em andamento (tentativaId null se não houver)
 *   POST /api/tentativas/:id/apresentar     registra o início da etapa atual e devolve a questão
 *   GET  /api/tentativas/:id/progresso      progresso da tentativa
 *   POST /api/tentativas/:id/respostas      envia a resposta da questão atual
 *   POST /api/tentativas/:id/finalizar      encerra a avaliação antes do fim
 *   GET  /api/tentativas/:id/resultado      resultado completo (após finalizar)
 */
const express = require('express');
const { asyncHandler, sameOriginJson } = require('../middleware/http');
const { requireAuth } = require('../middleware/auth');

function createApiRouter({ authController, attemptController }) {
  const router = express.Router();
  router.use(sameOriginJson);

  // Autenticação
  router.post('/auth/cadastro', asyncHandler(authController.register));
  router.post('/auth/login', asyncHandler(authController.login));
  router.post('/auth/esqueci-senha', asyncHandler(authController.forgotPassword));
  router.post('/auth/redefinir-senha', asyncHandler(authController.resetPassword));
  router.get('/auth/config', authController.config);
  router.get('/auth/google', asyncHandler(authController.googleStart));
  router.get('/auth/google/callback', asyncHandler(authController.googleCallback));
  router.get('/auth/me', requireAuth, authController.me);
  router.get('/auth/sessao', authController.session);
  router.post('/auth/logout', requireAuth, authController.logout);

  // Avaliação
  router.get('/teste/info', attemptController.info);
  router.post('/tentativas', requireAuth, attemptController.start);
  router.get('/tentativas', requireAuth, attemptController.history);
  router.get('/tentativas/atual', requireAuth, attemptController.current);
  router.post('/tentativas/:id/apresentar', requireAuth, attemptController.present);
  router.get('/tentativas/:id/progresso', requireAuth, attemptController.progress);
  router.post('/tentativas/:id/respostas', requireAuth, attemptController.answer);
  router.post('/tentativas/:id/finalizar', requireAuth, attemptController.finish);
  router.get('/tentativas/:id/resultado', requireAuth, attemptController.result);

  return router;
}

module.exports = { createApiRouter };
