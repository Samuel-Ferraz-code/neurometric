/** Controlador das tentativas: iniciar, apresentar, responder, finalizar, resultados e histórico. */
function createAttemptController({ attemptService }) {
  return {
    info: (req, res) => res.json(attemptService.info()),

    start: (req, res) => {
      const out = attemptService.startOrResume(req.user.id);
      res.status(out.retomada ? 200 : 201).json(out);
    },

    current: (req, res) => {
      const active = attemptService.activeAttempt(req.user.id);
      res.json(active || { tentativaId: null });
    },

    present: (req, res) => res.json(attemptService.present(req.user.id, req.params.id)),

    progress: (req, res) => res.json(attemptService.progress(req.user.id, req.params.id)),

    answer: (req, res) => res.json(attemptService.answer(req.user.id, req.params.id, req.body)),

    finish: (req, res) => res.json(attemptService.finishEarly(req.user.id, req.params.id)),

    result: (req, res) => res.json(attemptService.result(req.user.id, req.params.id)),

    history: (req, res) => res.json({ tentativas: attemptService.history(req.user.id) }),
  };
}

module.exports = { createAttemptController };
