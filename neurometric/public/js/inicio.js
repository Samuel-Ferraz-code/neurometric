/**
 * NeuroMetric — página inicial.
 * Atualiza contadores com dados reais do servidor e adapta o botão principal ao usuário logado.
 */
(function () {
  'use strict';

  // Botão "Role para saber mais"
  document.querySelectorAll('[data-scroll-to]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.scrollTo).scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Quantidade de questões e de habilidades vem do banco instalado no servidor.
  window.NM.get('/api/teste/info').then((info) => {
    if (!info.bancoInstalado) return;
    document.querySelectorAll('[data-total]').forEach((node) => { node.textContent = info.total; });
    document.querySelectorAll('[data-categories]').forEach((node) => { node.textContent = info.categorias.length; });
  }).catch(() => {});

  // Usuário logado: o hero leva direto para a tela "Iniciar teste".
  document.addEventListener('nm:user', (event) => {
    if (!event.detail) return;
    const cta = document.querySelector('[data-hero-cta]');
    cta.setAttribute('href', 'iniciar-teste.html');
    document.querySelector('[data-hero-cta-text]').textContent = 'Iniciar teste';
    document.querySelector('[data-hero-title]').textContent = 'Inicie o teste para descobrir seu';
  });
})();
