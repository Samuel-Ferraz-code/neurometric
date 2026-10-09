/**
 * NeuroMetric — comportamento comum às páginas com cabeçalho.
 * Mostra "Sair" no lugar de "Entrar" quando há sessão e coloca o nome do usuário no avatar.
 */
(function () {
  'use strict';

  /** Promessa com o usuário da sessão; outras telas podem aguardá-la (window.NM.userReady). */
  window.NM.userReady = window.NM.currentUser();

  async function syncHeader() {
    const button = document.querySelector('[data-auth-button]');
    const avatar = document.querySelector('[data-avatar]');
    const user = await window.NM.userReady;
    window.NM.user = user;
    document.dispatchEvent(new CustomEvent('nm:user', { detail: user }));
    if (!user) return;
    if (avatar) avatar.title = user.name;
    if (button) {
      button.textContent = 'Sair';
      button.setAttribute('href', '#');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        window.NM.logout();
      });
    }
  }

  syncHeader();
})();
