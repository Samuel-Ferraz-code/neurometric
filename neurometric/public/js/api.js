/**
 * NeuroMetric — cliente da API (compartilhado por todas as páginas).
 * Usa fetch() com async/await. A sessão fica em um cookie HttpOnly definido pelo
 * servidor; nada sensível é guardado no localStorage.
 */
(function () {
  'use strict';

  class ApiError extends Error {
    constructor(status, payload) {
      super((payload && payload.mensagem) || 'Não foi possível concluir a operação.');
      this.status = status;
      this.code = payload && payload.erro;
      this.fields = (payload && payload.campos) || {};
    }
  }

  async function request(method, url, body) {
    const options = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetch(url, options);
    } catch {
      throw new ApiError(0, { mensagem: 'Sem conexão com o servidor. Verifique se ele está em execução.' });
    }
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new ApiError(response.status, payload);
    return payload;
  }

  /** Formata segundos como HH:MM:SS (cronômetro geral). */
  function formatHms(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }

  /** Formata segundos como MM:SS (cronômetro da questão). */
  function formatMs(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  }

  /** Cria um elemento com classes e texto (evita innerHTML com dados vindos do servidor). */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name, extraClass) {
    return el('span', `material-symbols-outlined${extraClass ? ` ${extraClass}` : ''}`, name);
  }

  window.NM = {
    ApiError,
    get: (url) => request('GET', url),
    post: (url, body = {}) => request('POST', url, body),
    formatHms,
    formatMs,
    el,
    icon,
    async currentUser() {
      try {
        const data = await request('GET', '/api/auth/sessao');
        return data.usuario;
      } catch {
        return null;
      }
    },
    async logout() {
      try { await request('POST', '/api/auth/logout', {}); } catch { /* sessão já expirada */ }
      window.location.href = 'index.html';
    },
  };
})();
