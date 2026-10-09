/**
 * NeuroMetric — fluxo da avaliação (teste.html).
 *
 * 1. Descobre a tentativa em andamento do usuário (ou volta para "Iniciar teste").
 * 2. Pede ao servidor a etapa atual (POST /apresentar): memorização ou questão.
 * 3. Mostra os cronômetros a partir dos horários do servidor.
 * 4. Envia a resposta confirmada; o servidor corrige, grava o tempo e avança.
 * 5. Ao fim, abre a página de resultados.
 * Atualizar a página em qualquer momento retoma exatamente do mesmo ponto.
 */
(function () {
  'use strict';
  const { get, post, el, formatHms, formatMs } = window.NM;
  const { serverClock, createStopwatch } = window.NMTimer;
  const $ = (id) => document.getElementById(id);

  const views = { state: $('view-state'), memo: $('view-memo'), question: $('view-question') };
  const totalWatch = createStopwatch($('timer-total'), formatHms);
  const questionWatch = createStopwatch($('timer-question'), formatMs);

  let attemptId = null;
  let current = null; // estado atual devolvido pelo servidor
  let memoTimer = null;
  let sending = false;

  function show(name) {
    Object.entries(views).forEach(([key, node]) => { node.hidden = key !== name; });
  }

  function showState(text, { error = false, actionText, actionHref } = {}) {
    $('state-text').textContent = text;
    $('state-icon').textContent = error ? 'error' : 'progress_activity';
    $('state-icon').classList.toggle('anim-spin', !error);
    const action = $('state-action');
    action.hidden = !actionText;
    if (actionText) { action.textContent = actionText; action.setAttribute('href', actionHref); }
    show('state');
  }

  function updateProgress(state) {
    const percent = Math.round((state.respondidas / state.total) * 100);
    $('progress-current').textContent = state.posicao;
    $('progress-total').textContent = state.total;
    $('progress-percent').textContent = `${percent}% concluído`;
    $('progress-fill').style.setProperty('--progress', `${percent}%`);
    $('progress-bar').setAttribute('aria-valuenow', String(percent));
  }

  function syncTimers(state) {
    serverClock.sync(state.servidorAgora);
    if (state.inicioGeral) totalWatch.start(state.inicioGeral); else totalWatch.reset();
    if (state.fase === 'questao') questionWatch.start(state.inicioQuestao); else questionWatch.reset();
  }

  // ---- Memorização --------------------------------------------------------
  function renderMemo(state) {
    const { sequencia, terminaEm, duracaoMs } = state.memorizacao;
    $('memo-digits').replaceChildren(...sequencia.split(/\s+/).filter(Boolean).map((d) => el('span', 'memo-digit', d)));
    show('memo');
    clearInterval(memoTimer);
    const tick = () => {
      const left = Math.max(0, terminaEm - serverClock.now());
      $('memo-seconds').textContent = Math.ceil(left / 1000);
      $('memo-fill').style.setProperty('--progress', `${(left / duracaoMs) * 100}%`);
      if (left <= 0) {
        clearInterval(memoTimer);
        $('memo-digits').replaceChildren(); // a sequência some antes da pergunta
        present();
      }
    };
    tick();
    memoTimer = setInterval(tick, 200);
  }

  // ---- Questão ------------------------------------------------------------
  function buildOption(alt, withImages) {
    const label = el('label', withImages ? 'option option--image' : 'option');
    const input = el('input', 'sr-only');
    input.type = 'radio';
    input.name = 'alternativa';
    input.value = alt.letra;
    const letter = el('span', 'option__letter', alt.letra);

    if (withImages) {
      const head = el('span', 'option__head');
      head.append(letter);
      if (alt.texto) head.append(el('span', 'option__text', alt.texto));
      const img = el('img');
      img.src = alt.imagem;
      img.alt = `Alternativa ${alt.letra}`;
      img.loading = 'lazy';
      label.append(input, head, img);
    } else {
      label.append(input, letter, el('span', 'option__text', alt.texto));
    }

    input.addEventListener('change', () => selectOption(alt.letra));
    return label;
  }

  function selectOption(letter) {
    document.querySelectorAll('#q-options .option').forEach((node) => {
      const input = node.querySelector('input');
      const selected = input.value === letter;
      input.checked = selected;
      node.classList.toggle('is-selected', selected);
    });
    $('btn-confirm').disabled = false;
  }

  function renderQuestion(state) {
    const q = state.questao;
    $('q-category').textContent = q.categoria;
    $('q-number').textContent = `Questão ${state.posicao} de ${state.total}`;
    $('q-statement').textContent = q.enunciado;

    $('q-figure').hidden = !q.imagem;
    if (q.imagem) $('q-image').src = q.imagem;

    const withImages = q.alternativas.some((a) => a.imagem);
    const fieldset = $('q-options');
    fieldset.classList.toggle('options--images', withImages);
    fieldset.replaceChildren(el('legend', 'sr-only', 'Alternativas'), ...q.alternativas.map((a) => buildOption(a, withImages)));

    const button = $('btn-confirm');
    button.disabled = true;
    button.replaceChildren(el('span', null, 'Confirmar resposta'), window.NM.icon('arrow_forward', 'icon-18'));
    show('question');
    $('q-statement').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- Comunicação com o servidor ----------------------------------------
  async function present() {
    try {
      const state = await post(`/api/tentativas/${attemptId}/apresentar`, {});
      current = state;
      updateProgress(state);
      syncTimers(state);
      if (state.fase === 'memorizacao') renderMemo(state);
      else renderQuestion(state);
    } catch (err) {
      handleError(err);
    }
  }

  async function confirmAnswer(event) {
    event.preventDefault();
    const chosen = document.querySelector('#q-options input:checked');
    if (!chosen || sending || !current || current.fase !== 'questao') return;
    sending = true;
    const button = $('btn-confirm');
    button.disabled = true;
    button.replaceChildren(window.NM.icon('progress_activity', 'icon-18 anim-spin'), el('span', null, 'Registrando...'));
    questionWatch.freeze();
    try {
      const out = await post(`/api/tentativas/${attemptId}/respostas`, { questaoId: current.questao.id, alternativa: chosen.value });
      if (out.finalizada) {
        totalWatch.freeze();
        window.location.href = `resultado.html?id=${attemptId}`;
        return;
      }
      await present();
    } catch (err) {
      // 409: a questão já foi respondida (ex.: outra aba) — recarrega o estado real do servidor.
      if (err.status === 409) await present();
      else handleError(err);
    } finally {
      sending = false;
    }
  }

  function handleError(err) {
    if (err.status === 401) {
      window.location.href = `login.html?next=${encodeURIComponent('/teste.html')}`;
      return;
    }
    if (err.status === 409 && /finalizada/.test(err.message)) {
      window.location.href = `resultado.html?id=${attemptId}`;
      return;
    }
    showState(err.message, { error: true, actionText: 'Voltar', actionHref: 'iniciar-teste.html' });
  }

  // ---- Encerrar antes do fim ----------------------------------------------
  const dialog = $('dialog-finish');
  $('btn-finish').addEventListener('click', () => { if (attemptId) dialog.showModal(); });
  $('dialog-cancel').addEventListener('click', () => dialog.close());
  $('dialog-confirm').addEventListener('click', async () => {
    dialog.close();
    try {
      await post(`/api/tentativas/${attemptId}/finalizar`, {});
      window.location.href = `resultado.html?id=${attemptId}`;
    } catch (err) {
      handleError(err);
    }
  });

  // ---- Teclado: A–E escolhe, Enter confirma -------------------------------
  document.addEventListener('keydown', (event) => {
    if (views.question.hidden || dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toUpperCase();
    if (['A', 'B', 'C', 'D', 'E'].includes(key)) selectOption(key);
    if (event.key === 'Enter' && !$('btn-confirm').disabled) $('q-form').requestSubmit();
  });

  $('q-form').addEventListener('submit', confirmAnswer);

  // ---- Início ---------------------------------------------------------------
  (async function init() {
    try {
      const active = await get('/api/tentativas/atual');
      if (!active.tentativaId) {
        showState('Você não tem uma avaliação em andamento.', { error: true, actionText: 'Iniciar uma avaliação', actionHref: 'iniciar-teste.html' });
        return;
      }
      attemptId = active.tentativaId;
      await present();
    } catch (err) {
      handleError(err);
    }
  })();
})();
