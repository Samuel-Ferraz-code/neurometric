/**
 * NeuroMetric — tela "Iniciar teste".
 * Busca no servidor a quantidade de questões e as habilidades avaliadas,
 * e inicia (ou retoma) a tentativa do usuário autenticado.
 */
(function () {
  'use strict';
  const { get, post, el } = window.NM;
  const button = document.getElementById('btn-start-quiz');
  const hint = document.getElementById('start-hint');
  let bankReady = true;

  async function loadInfo() {
    try {
      const info = await get('/api/teste/info');
      bankReady = info.bancoInstalado;
      document.getElementById('bank-missing').hidden = bankReady;
      if (!bankReady) return;
      document.querySelectorAll('[data-total]').forEach((node) => { node.textContent = info.total; });
      const list = document.getElementById('skills-list');
      list.replaceChildren(...info.categorias.map((name) => el('span', 'chip', name)));
      document.getElementById('skills-count').textContent = info.categorias.length;
      document.getElementById('skills').hidden = info.categorias.length === 0;
    } catch {
      hint.textContent = 'Não foi possível consultar o servidor.';
      hint.hidden = false;
    }
  }

  /** Se já houver uma avaliação em andamento, o botão vira "Continuar". */
  document.addEventListener('nm:user', async (event) => {
    if (!event.detail) return;
    try {
      const active = await get('/api/tentativas/atual');
      if (!active.tentativaId) return;
      button.querySelector('span').textContent = 'Continuar avaliação';
      hint.textContent = 'Você tem uma avaliação em andamento. Ela continua de onde parou.';
      hint.hidden = false;
    } catch { /* nenhuma tentativa ativa */ }
  });

  button.addEventListener('click', async () => {
    if (!bankReady) return;
    const user = await window.NM.userReady; // espera a verificação da sessão terminar
    if (!user) {
      window.location.href = `login.html?next=${encodeURIComponent('/iniciar-teste.html')}`;
      return;
    }
    button.disabled = true;
    button.replaceChildren(window.NM.icon('progress_activity', 'icon-20 anim-spin'), el('span', null, 'INICIANDO...'));
    try {
      await post('/api/tentativas', {});
      window.location.href = 'teste.html';
    } catch (err) {
      button.disabled = false;
      button.replaceChildren(el('span', null, 'Iniciar Quiz'), window.NM.icon('arrow_forward', 'icon-20'));
      hint.textContent = err.message;
      hint.hidden = false;
    }
  });

  loadInfo();
})();
