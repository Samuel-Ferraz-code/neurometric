/**
 * NeuroMetric — página de resultados (resultado.html).
 * Todos os números exibidos vêm do servidor (GET /api/tentativas/:id/resultado).
 * Os gráficos são SVG gerados aqui, sem bibliotecas externas e sem dados fictícios.
 */
(function () {
  'use strict';
  const { get, el, icon, formatHms, formatMs } = window.NM;
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = { ok: '#0058BE', bad: '#BA1A1A', none: '#94A3B8', grid: '#CBD5E1', axis: '#94A3B8', text: '#64748B', ink: '#14213D', track: '#E2E8EE' };

  const params = new URLSearchParams(window.location.search);
  let data = null;

  // ---- Utilidades --------------------------------------------------------
  const decimal = (n, digits = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (ms) => new Date(ms).toLocaleDateString('pt-BR');
  const fmtTime = (ms) => { const d = new Date(ms); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const secs = (s) => (s === null || s === undefined ? '—' : formatMs(s));

  function svg(tag, attrs = {}, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgText(x, y, text, { size = 10, anchor = 'middle', weight = 400, fill = COLORS.text } = {}) {
    return svg('text', { x, y, fill, 'font-family': 'Inter, sans-serif', 'font-size': size, 'font-weight': weight, 'text-anchor': anchor }, text);
  }

  function showState(text, { error = false, actionText, actionHref } = {}) {
    $('results-state').hidden = false;
    $('results-content').hidden = true;
    $('results-state-text').textContent = text;
    $('results-state-icon').textContent = error ? 'info' : 'progress_activity';
    $('results-state-icon').classList.toggle('anim-spin', !error);
    const action = $('results-state-action');
    action.hidden = !actionText;
    if (actionText) { action.textContent = actionText; action.setAttribute('href', actionHref); }
  }

  // ---- Cabeçalho, pontuação e QI ------------------------------------------
  function renderIntro() {
    const { tentativa, resumo } = data;
    $('attempt-number').textContent = tentativa.numero;
    $('completion-label').textContent = tentativa.status === 'encerrada' ? 'Encerrado antes do fim em' : 'Concluído em';
    $('completion-date').textContent = fmtDate(tentativa.fim);
    $('completion-time').textContent = fmtTime(tentativa.fim);
    document.querySelectorAll('[data-total]').forEach((n) => { n.textContent = resumo.total; });
    $('score-val').textContent = decimal(resumo.pontuacao);
    $('score-bar').style.setProperty('--value', `${resumo.pontuacao}%`);

    const iq = data.qi;
    $('iq-reason').textContent = iq.motivo;
    if (iq.status === 'experimental') {
      $('iq-value').hidden = false;
      $('iq-value').textContent = iq.valor;
      $('iq-status-text').textContent = 'Estimativa experimental';
    } else {
      $('iq-status-text').textContent = 'Aguardando amostra de referência';
    }
  }

  function renderStats() {
    const r = data.resumo;
    const cards = [
      ['Questões', 'fact_check', 'text-secondary', r.total, r.naoRespondidas ? `${r.naoRespondidas} não respondida(s)` : 'todas respondidas'],
      ['Acertos', 'check_circle', 'text-primary', `${r.acertos}/${r.total}`, `${decimal(r.aproveitamento, 0)}% de aproveitamento`],
      ['Erros', 'cancel', 'text-error', r.erros, 'respostas incorretas'],
      ['Aproveitamento', 'adjust', 'text-tertiary', `${decimal(r.aproveitamento)}%`, '(acertos ÷ total) × 100'],
      ['Tempo total', 'hourglass_top', 'text-secondary', formatHms(r.tempoTotalSegundos), 'sem limite de tempo'],
      ['Tempo médio', 'timer', 'text-secondary', secs(r.tempoMedioSegundos === null ? null : Math.round(r.tempoMedioSegundos)), 'por questão respondida'],
      ['Mais rápida', 'bolt', 'text-primary', r.questaoMaisRapida ? `Q${r.questaoMaisRapida.position}` : '—', r.questaoMaisRapida ? `${secs(r.questaoMaisRapida.seconds)} de resposta` : 'sem respostas'],
      ['Mais demorada', 'snooze', 'text-violet', r.questaoMaisDemorada ? `Q${r.questaoMaisDemorada.position}` : '—', r.questaoMaisDemorada ? `${secs(r.questaoMaisDemorada.seconds)} de resposta` : 'sem respostas'],
    ];
    $('stat-grid').replaceChildren(...cards.map(([label, ic, color, value, sub]) => {
      const card = el('div', 'stat-card');
      const head = el('div', 'stat-card__head');
      head.append(el('span', 'eyebrow', label), icon(ic, `icon-18 ${color}`));
      card.append(head, el('div', 'stat-card__value', String(value)), el('span', 'stat-card__sub', sub));
      return card;
    }));
  }

  // ---- Gráficos -----------------------------------------------------------
  const CHARTS = {
    line: {
      title: 'Evolução do desempenho acumulado',
      caption: 'Após cada questão: pontos acumulados ÷ pontos máximos acumulados × 100. Pontos vermelhos indicam respostas incorretas; cinza, questões em branco.',
      render: renderLineChart,
    },
    bar: {
      title: 'Tempo gasto em cada questão',
      caption: 'Tempo (em segundos) registrado pelo servidor entre a apresentação e a confirmação de cada questão. Azul: correta; vermelho: incorreta.',
      render: renderBarChart,
    },
    pie: {
      title: 'Proporção de acertos e erros',
      caption: 'Distribuição das questões entre respostas corretas, incorretas e não respondidas.',
      render: renderPieChart,
    },
  };

  function frame() {
    const root = svg('svg', { class: 'chart-svg', viewBox: '0 0 880 270', preserveAspectRatio: 'none', role: 'img' });
    return root;
  }

  function gridLines(root, ticks, toY, label) {
    ticks.forEach((t, i) => {
      const y = toY(t);
      root.append(svg('line', { x1: 48, x2: 860, y1: y, y2: y, stroke: i === 0 ? COLORS.axis : COLORS.grid, 'stroke-width': 1, 'stroke-dasharray': i === 0 ? '' : '3 3' }));
      root.append(svgText(40, y + 4, label(t), { anchor: 'end' }));
    });
  }

  function xFor(i, n) { return 70 + (i * (780 / Math.max(1, n - 1))); }

  function renderLineChart(area) {
    const points = data.acumulado;
    const toY = (v) => 230 - (v / 100) * 200;
    const root = frame();
    root.setAttribute('aria-label', 'Desempenho acumulado por questão');
    gridLines(root, [0, 25, 50, 75, 100], toY, (t) => `${t}%`);
    const coords = points.map((p, i) => [xFor(i, points.length), toY(p.acumulado)]);
    const defs = svg('defs');
    const grad = svg('linearGradient', { id: 'lineGrad', x1: 0, x2: 0, y1: 0, y2: 1 });
    grad.append(svg('stop', { offset: '0%', 'stop-color': '#3B82F6', 'stop-opacity': 0.25 }), svg('stop', { offset: '100%', 'stop-color': '#3B82F6', 'stop-opacity': 0 }));
    defs.append(grad);
    root.append(defs);
    const first = coords[0];
    const last = coords[coords.length - 1];
    root.append(svg('polygon', { fill: 'url(#lineGrad)', points: `${first[0]},230 ${coords.map((c) => c.join(',')).join(' ')} ${last[0]},230` }));
    root.append(svg('polyline', { fill: 'none', stroke: '#3B82F6', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', points: coords.map((c) => c.join(',')).join(' ') }));
    points.forEach((p, i) => {
      const [x, y] = coords[i];
      const color = p.correta === true ? '#3B82F6' : p.correta === false ? COLORS.bad : COLORS.none;
      const dot = svg('circle', { cx: x, cy: y, r: p.correta === true ? 4 : 5.5, fill: color, stroke: '#FFFFFF', 'stroke-width': p.correta === true ? 0 : 1.5 });
      dot.append(svg('title', {}, `Questão ${p.posicao}: ${decimal(p.acumulado)}% acumulado`));
      root.append(dot);
      root.append(svgText(x, 252, `Q${p.posicao}`));
    });
    area.replaceChildren(root);
  }

  function renderBarChart(area) {
    const qs = data.questoes;
    const max = Math.max(10, ...qs.map((q) => q.segundos || 0));
    const step = max <= 30 ? 10 : max <= 120 ? 30 : max <= 300 ? 60 : 120;
    const top = Math.ceil(max / step) * step;
    const toY = (v) => 230 - (v / top) * 200;
    const root = frame();
    root.setAttribute('aria-label', 'Tempo em segundos por questão');
    const ticks = [];
    for (let t = 0; t <= top; t += step) ticks.push(t);
    gridLines(root, ticks, toY, (t) => `${t}s`);
    const slot = 800 / qs.length;
    const width = Math.min(44, slot * 0.6);
    qs.forEach((q, i) => {
      const x = 56 + slot * i + (slot - width) / 2;
      const center = x + width / 2;
      if (q.segundos !== null) {
        const y = toY(q.segundos);
        const color = q.situacao === 'correta' ? COLORS.ok : COLORS.bad;
        const bar = svg('rect', { x, y, width, height: Math.max(1, 230 - y), rx: 6, fill: color, opacity: 0.92 });
        bar.append(svg('title', {}, `Questão ${q.posicao}: ${q.segundos} s (${q.situacao})`));
        root.append(bar);
        root.append(svgText(center, y - 8, `${q.segundos}s`, { size: 11, weight: 700, fill: COLORS.ink }));
      } else {
        root.append(svgText(center, 222, '—', { size: 11 }));
      }
      root.append(svgText(center, 250, `Q${q.posicao}`, { size: 10.5, weight: 600, fill: '#525E7D' }));
    });
    area.replaceChildren(root);
  }

  function renderPieChart(area) {
    const r = data.resumo;
    const slices = [
      { label: 'Corretas', value: r.acertos, color: COLORS.ok, swatch: 'legend__swatch--ok' },
      { label: 'Incorretas', value: r.erros, color: COLORS.bad, swatch: 'legend__swatch--err' },
      { label: 'Não respondidas', value: r.naoRespondidas, color: COLORS.none, swatch: 'legend__swatch--none' },
    ];
    const total = r.total;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const root = svg('svg', { class: 'pie-svg', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'Proporção de acertos e erros' });
    root.append(svg('circle', { cx: 100, cy: 100, r: radius, fill: 'transparent', stroke: COLORS.track, 'stroke-width': 26 }));
    let offset = 0;
    slices.filter((s) => s.value > 0).forEach((s) => {
      const share = s.value / total;
      const seg = svg('circle', {
        cx: 100, cy: 100, r: radius, fill: 'transparent', stroke: s.color, 'stroke-width': 26,
        'stroke-dasharray': `${share * circumference} ${circumference}`, 'stroke-dashoffset': -offset * circumference,
        transform: 'rotate(-90 100 100)',
      });
      seg.append(svg('title', {}, `${s.label}: ${s.value} (${decimal(share * 100)}%)`));
      root.append(seg);
      offset += share;
    });
    root.append(svgText(100, 98, `${r.acertos}/${total}`, { size: 22, weight: 800, fill: COLORS.ink }));
    root.append(svgText(100, 116, 'acertos', { size: 11, weight: 500 }));

    const figure = el('div', 'pie-figure');
    figure.append(root, el('span', 'label-sm', 'Distribuição das respostas'));
    const legend = el('div', 'legend');
    slices.forEach((s) => {
      const item = el('div', 'legend__item');
      const name = el('span', 'legend__name');
      name.append(el('span', `legend__swatch ${s.swatch}`), el('span', null, s.label));
      item.append(name, el('strong', null, `${s.value} • ${decimal((s.value / total) * 100)}%`));
      legend.append(item);
    });
    const layout = el('div', 'pie-layout');
    layout.append(figure, legend);
    area.replaceChildren(layout);
  }

  function setChart(type) {
    const chart = CHARTS[type];
    document.querySelectorAll('[data-chart]').forEach((b) => {
      const active = b.dataset.chart === type;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    $('chart-main-title').textContent = chart.title;
    $('chart-caption-text').textContent = chart.caption;
    chart.render($('chart-area'));
  }

  document.querySelectorAll('[data-chart]').forEach((b) => b.addEventListener('click', () => setChart(b.dataset.chart)));

  // ---- Categorias ---------------------------------------------------------
  function renderCategories() {
    $('category-grid').replaceChildren(...data.categorias.map((c) => {
      const card = el('div', 'category-card');
      const top = el('div');
      const head = el('div', 'category-card__head');
      head.append(el('h3', 'category-card__name', c.nome), el('span', 'mini-badge', `${c.acertos}/${c.total}`));
      const score = el('div', 'category-card__score');
      score.append(el('strong', null, decimal(c.normalizado)), el('span', null, '/100'));
      const track = el('div', 'bar-track bar-track--thin');
      const fill = el('div', 'bar-fill');
      fill.style.setProperty('--value', `${c.normalizado}%`);
      track.append(fill);
      top.append(head, score, track);
      const foot = el('div', 'category-card__foot');
      const avg = el('span', null, 'Média: ');
      avg.append(el('strong', null, c.mediaSegundos === null ? '—' : `${decimal(c.mediaSegundos)}s`));
      const prec = el('span', null, 'Precisão: ');
      prec.append(el('strong', 'text-primary', `${c.precisao}%`));
      foot.append(avg, prec);
      card.append(top, foot);
      return card;
    }));

    const cell = (text, cls) => el('td', cls, String(text));
    $('category-rows').replaceChildren(...data.categorias.map((c) => {
      const tr = el('tr');
      tr.append(
        cell(c.nome, 'strong'), cell(c.total, 'num'), cell(c.acertos, 'num ok'), cell(c.erros, c.erros ? 'num bad' : 'num'),
        cell(c.naoRespondidas, 'num muted'), cell(`${c.precisao}%`, 'num'), cell(formatMs(c.segundos), 'right'),
        cell(c.mediaSegundos === null ? '—' : `${decimal(c.mediaSegundos)}s`, 'right'), cell(decimal(c.normalizado), 'right accent'),
      );
      return tr;
    }));
    const r = data.resumo;
    const total = el('tr');
    total.append(
      cell('TOTAL'), cell(r.total, 'num'), cell(r.acertos, 'num ok'), cell(r.erros, 'num bad'), cell(r.naoRespondidas, 'num'),
      cell(`${decimal(r.aproveitamento)}%`, 'num'), cell(formatHms(r.tempoTotalSegundos), 'right'),
      cell(r.tempoMedioSegundos === null ? '—' : `${decimal(r.tempoMedioSegundos)}s`, 'right'), cell(decimal(r.pontuacao), 'right accent'),
    );
    $('category-total').replaceChildren(total);
  }

  // ---- Revisão comentada ------------------------------------------------
  const STATUS = {
    correta: ['Correta', 'status-badge--ok'],
    incorreta: ['Incorreta', 'status-badge--bad'],
    nao_respondida: ['Não respondida', 'status-badge--none'],
  };

  function optionLabel(q, letter) {
    const alt = q.alternativas.find((a) => a.letra === letter);
    if (!alt) return '—';
    return alt.texto ? `${letter}) ${alt.texto}` : `${letter}) (figura)`;
  }

  function renderReview() {
    const counts = { correta: 0, incorreta: 0, nao_respondida: 0 };
    $('questions-list').replaceChildren(...data.questoes.map((q) => {
      counts[q.situacao] += 1;
      const [statusText, statusClass] = STATUS[q.situacao];
      const card = el('details', `review-card${q.situacao === 'incorreta' ? ' is-wrong' : ''}`);
      const summary = el('summary');
      const top = el('div', 'review-card__top');
      top.append(el('span', 'review-card__title', `Questão ${pad2(q.posicao)} • ${q.categoria}`), el('span', `status-badge ${statusClass}`, statusText));
      const meta = el('div', 'review-card__meta');
      meta.append(
        el('span', null, `Sua resposta: ${q.respostaUsuario ? optionLabel(q, q.respostaUsuario) : '—'}`),
        el('span', null, `Tempo: ${secs(q.segundos)}`),
      );
      const toggle = el('span', 'review-card__toggle');
      toggle.append(el('span', null, 'Ver alternativas e explicação'), icon('expand_more', 'icon-18'));
      summary.append(top, el('p', 'review-card__statement', q.enunciado), meta, toggle);

      const details = el('div', 'review-card__details');
      if (q.memorizacao) details.append(el('p', 'text-body-sm', `Sequência apresentada: ${q.memorizacao.sequencia}`));
      if (q.imagem) {
        const fig = el('div', 'review-card__figure');
        const img = el('img');
        img.src = q.imagem;
        img.alt = `Figura da questão ${q.posicao}`;
        img.loading = 'lazy';
        fig.append(img);
        details.append(fig);
      }
      const list = el('div', 'review-options');
      q.alternativas.forEach((a) => {
        const isCorrect = a.letra === q.respostaCorreta;
        const isChosen = a.letra === q.respostaUsuario;
        const row = el('div', `review-option${isCorrect ? ' is-correct' : ''}${isChosen && !isCorrect ? ' is-chosen-wrong' : ''}`);
        row.append(el('span', 'review-option__letter', a.letra));
        if (a.imagem) {
          const img = el('img');
          img.src = a.imagem;
          img.alt = `Alternativa ${a.letra}`;
          img.loading = 'lazy';
          row.append(img);
        }
        if (a.texto) row.append(el('span', null, a.texto));
        const flags = [];
        if (isCorrect) flags.push('Resposta correta');
        if (isChosen) flags.push('Sua resposta');
        if (flags.length) row.append(el('span', 'review-option__flag', flags.join(' • ')));
        list.append(row);
      });
      const explanation = el('p', 'review-card__explanation');
      explanation.append(el('strong', null, 'Explicação: '), document.createTextNode(q.explicacao || 'Sem explicação cadastrada.'));
      details.append(el('p', 'text-body-sm', `Resposta correta: ${optionLabel(q, q.respostaCorreta)}`), list, explanation);

      card.append(summary, details);
      return card;
    }));
    $('legend-ok').textContent = counts.correta;
    $('legend-bad').textContent = counts.incorreta;
    $('legend-none').textContent = counts.nao_respondida;
  }

  $('btn-toggle-review').addEventListener('click', () => {
    const container = $('review-container');
    const open = container.hidden;
    container.hidden = !open;
    $('btn-toggle-review').setAttribute('aria-expanded', String(open));
    $('review-btn-text').textContent = open ? 'Ocultar revisão' : 'Mostrar revisão';
    $('review-icon').textContent = open ? 'expand_less' : 'grid_view';
  });

  // ---- Histórico ----------------------------------------------------------
  const STATUS_LABEL = { finalizada: 'Concluída', encerrada: 'Encerrada antes do fim', em_andamento: 'Em andamento' };

  function renderHistory(list, currentId) {
    $('history-rows').replaceChildren(...list.map((h) => {
      const tr = el('tr', `history-row${h.id === currentId ? ' is-current' : ''}`);
      const link = el('a');
      if (h.status === 'em_andamento') { link.href = 'teste.html'; link.textContent = 'Continuar'; } else if (h.id === currentId) { link.textContent = 'Exibindo'; } else { link.href = `resultado.html?id=${h.id}`; link.textContent = 'Ver resultado'; }
      const action = el('td', 'right');
      action.append(link);
      tr.append(
        el('td', 'strong', `#${h.numero}`),
        el('td', null, `${fmtDate(h.criadaEm)} ${fmtTime(h.criadaEm)}`),
        el('td', null, STATUS_LABEL[h.status] || h.status),
        el('td', 'num', h.acertos === null ? '—' : `${h.acertos}/${h.total}`),
        el('td', 'num accent', h.pontuacao === null ? '—' : decimal(h.pontuacao)),
        el('td', 'right', h.tempoTotalSegundos === null ? '—' : formatHms(h.tempoTotalSegundos)),
        action,
      );
      return tr;
    }));
  }

  // ---- Início ---------------------------------------------------------------
  $('btn-logout').addEventListener('click', (e) => { e.preventDefault(); window.NM.logout(); });

  (async function init() {
    try {
      const user = await window.NM.currentUser();
      if (user) document.querySelector('[data-avatar]').title = user.name;
      const { tentativas } = await get('/api/tentativas');
      let id = Number(params.get('id'));
      if (!id) {
        const latest = tentativas.find((t) => t.status !== 'em_andamento');
        if (!latest) {
          showState('Você ainda não concluiu nenhuma avaliação.', { error: true, actionText: 'Iniciar avaliação', actionHref: 'iniciar-teste.html' });
          return;
        }
        id = latest.id;
      }
      data = await get(`/api/tentativas/${id}/resultado`);
      $('results-state').hidden = true;
      $('results-content').hidden = false;
      renderIntro();
      renderStats();
      setChart('line');
      renderCategories();
      renderReview();
      renderHistory(tentativas, id);
    } catch (err) {
      if (err.status === 401) { window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
      if (err.status === 409) { showState('Esta avaliação ainda está em andamento.', { error: true, actionText: 'Continuar avaliação', actionHref: 'teste.html' }); return; }
      showState(err.message, { error: true, actionText: 'Voltar ao início', actionHref: 'index.html' });
    }
  })();
})();
