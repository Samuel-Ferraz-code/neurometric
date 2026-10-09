/**
 * NeuroMetric — telas de autenticação (login.html, cadastro.html,
 * recuperar-senha.html e redefinir-senha.html).
 * A validação aqui dá retorno imediato; a validação definitiva é feita no servidor.
 */
(function () {
  'use strict';
  const { post, get } = window.NM;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);

  // ---- Comportamentos comuns ---------------------------------------------

  /** Abas Entrar / Criar Conta navegam entre as páginas. */
  document.querySelectorAll('.auth-tab[data-href]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const next = params.get('next');
      window.location.href = tab.dataset.href + (next ? `?next=${encodeURIComponent(next)}` : '');
    });
  });

  /** Botões de mostrar/ocultar senha. */
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $(button.dataset.togglePassword);
      const iconNode = button.querySelector('.material-symbols-outlined');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      iconNode.textContent = show ? 'visibility_off' : 'visibility';
    });
  });

  /** Coloca o botão em estado de carregamento (mesmo visual do Stitch). */
  function setLoading(button, text) {
    if (!button.dataset.original) button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.replaceChildren(
      window.NM.icon('progress_activity', 'icon-base anim-spin'),
      window.NM.el('span', null, text),
    );
  }

  function resetButton(button) {
    button.disabled = false;
    if (button.dataset.original) button.innerHTML = button.dataset.original;
  }

  function showMessage(box, textNode, message, type = 'error') {
    box.classList.toggle('alert--error', type === 'error');
    box.classList.toggle('alert--success', type === 'success');
    textNode.textContent = message;
    box.hidden = false;
  }

  /** Botão do Google: só redireciona se o servidor tiver credenciais configuradas. */
  async function setupGoogle(showError) {
    const button = $('btn-google');
    if (!button) return;
    let enabled = false;
    try { enabled = (await get('/api/auth/config')).google; } catch { enabled = false; }
    button.addEventListener('click', () => {
      if (enabled) window.location.href = '/api/auth/google';
      else showError('O login com Google ainda não foi configurado neste servidor. Use e-mail e senha.');
    });
    if (params.get('google') === 'desativado') showError('O login com Google ainda não foi configurado neste servidor. Use e-mail e senha.');
    if (params.get('google') === 'erro') showError('Não foi possível entrar com o Google. Tente novamente.');
  }

  // ---- Login --------------------------------------------------------------
  const loginForm = $('form-login');
  if (loginForm) {
    const box = $('login-error');
    const msg = $('login-error-msg');
    const showError = (m) => showMessage(box, msg, m);
    setupGoogle(showError);
    if (params.get('redefinida') === '1') showMessage(box, msg, 'Senha redefinida. Faça login com a nova senha.', 'success');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      box.hidden = true;
      const email = $('login-email').value.trim();
      const password = $('login-password').value;
      if (!email || !password) return showError('Informe e-mail e senha.');

      const button = loginForm.querySelector('button[type="submit"]');
      setLoading(button, 'Acessando...');
      try {
        const out = await post('/api/auth/login', {
          email,
          password,
          remember: $('login-remember').checked,
          next: params.get('next') || undefined,
        });
        window.location.href = out.redirecionar;
      } catch (err) {
        resetButton(button);
        showError(err.message);
      }
    });
  }

  // ---- Cadastro -----------------------------------------------------------
  const registerForm = $('register-form');
  if (registerForm) {
    const banner = $('validation-banner');
    const bannerText = $('validation-banner-text');
    const matchError = $('password-match-error');
    const showError = (m) => showMessage(banner, bannerText, m);
    setupGoogle(showError);

    /** Máscara do telefone: (00) 00000-0000 — mesma lógica do protótipo do Stitch. */
    $('reg-phone').addEventListener('input', (event) => {
      const input = event.target;
      let value = input.value.replace(/\D/g, '').slice(0, 11);
      if (value.length > 6) value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      else if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      else if (value.length > 0) value = `(${value}`;
      input.value = value;
    });

    const FIELD_INPUT = {
      email: 'reg-email', name: 'reg-name', age: 'reg-age', phone: 'reg-phone', password: 'reg-password',
    };

    function markInvalid(fields) {
      Object.values(FIELD_INPUT).forEach((id) => $(id).classList.remove('is-invalid'));
      Object.keys(fields).forEach((name) => FIELD_INPUT[name] && $(FIELD_INPUT[name]).classList.add('is-invalid'));
    }

    function validate(data) {
      const errors = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Informe um e-mail válido.';
      if (data.name.length < 3) errors.name = 'Informe seu nome completo.';
      if (!Number.isInteger(data.age) || data.age < 10 || data.age > 120) errors.age = 'Por favor, insira uma idade válida entre 10 e 120 anos.';
      const digits = data.phone.replace(/\D/g, '');
      if (digits && (digits.length < 10 || digits.length > 11)) errors.phone = 'Informe um telefone com DDD.';
      if (data.password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(data.password) || !/\d/.test(data.password)) {
        errors.password = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
      }
      if (data.password !== data.confirmPassword) errors.confirmPassword = 'As senhas não coincidem.';
      if (!data.acceptTerms) errors.acceptTerms = 'Você deve aceitar os Termos de Uso e Política de Privacidade.';
      return errors;
    }

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      banner.hidden = true;
      matchError.hidden = true;

      const data = {
        email: $('reg-email').value.trim(),
        name: $('reg-name').value.trim(),
        age: Number.parseInt($('reg-age').value, 10),
        phone: $('reg-phone').value.trim(),
        password: $('reg-password').value,
        confirmPassword: $('reg-confirm-password').value,
        acceptTerms: $('terms-checkbox').checked,
      };

      const errors = validate(data);
      markInvalid(errors);
      if (errors.confirmPassword) matchError.hidden = false;
      const first = Object.values(errors)[0];
      if (first) return showError(`*${first}`);

      const button = registerForm.querySelector('button[type="submit"]');
      setLoading(button, 'Criando conta...');
      try {
        const out = await post('/api/auth/cadastro', data);
        showMessage(banner, bannerText, 'Conta criada com sucesso! Redirecionando para o teste...', 'success');
        window.location.href = out.redirecionar;
      } catch (err) {
        resetButton(button);
        markInvalid(err.fields || {});
        if (err.fields && err.fields.password === 'As senhas não coincidem.') matchError.hidden = false;
        const detail = err.fields && Object.values(err.fields)[0];
        showError(`*${detail || err.message}`);
      }
    });
  }

  // ---- Recuperar senha ----------------------------------------------------
  const forgotForm = $('form-forgot');
  if (forgotForm) {
    const box = $('forgot-msg-box');
    const msg = $('forgot-msg');
    forgotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = forgotForm.querySelector('button[type="submit"]');
      setLoading(button, 'Enviando...');
      try {
        const out = await post('/api/auth/esqueci-senha', { email: $('forgot-email').value.trim() });
        showMessage(box, msg, out.mensagem, 'success');
      } catch (err) {
        showMessage(box, msg, err.message);
      } finally {
        resetButton(button);
      }
    });
  }

  // ---- Redefinir senha ----------------------------------------------------
  const resetForm = $('form-reset');
  if (resetForm) {
    const box = $('reset-msg-box');
    const msg = $('reset-msg');
    const token = params.get('token');
    if (!token) showMessage(box, msg, 'Link inválido. Solicite uma nova redefinição de senha.');
    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = $('reset-password').value;
      const confirmPassword = $('reset-confirm').value;
      if (password !== confirmPassword) return showMessage(box, msg, 'As senhas não coincidem.');
      const button = resetForm.querySelector('button[type="submit"]');
      setLoading(button, 'Salvando...');
      try {
        await post('/api/auth/redefinir-senha', { token, password, confirmPassword });
        window.location.href = 'login.html?redefinida=1';
      } catch (err) {
        resetButton(button);
        showMessage(box, msg, err.message);
      }
    });
  }
})();
