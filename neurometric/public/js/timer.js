/**
 * NeuroMetric — cronômetros da tela de questões.
 *
 * Os horários oficiais vêm do servidor (inicioGeral, inicioQuestao, servidorAgora).
 * O navegador apenas calcula a diferença entre o relógio dele e o do servidor e
 * atualiza o mostrador a cada 250 ms. Alterar este arquivo não altera os tempos
 * gravados: o servidor calcula o tempo de cada questão no momento da confirmação.
 */
(function () {
  'use strict';

  /** Relógio sincronizado com o servidor. */
  const serverClock = {
    offset: 0,
    sync(serverNow) { this.offset = serverNow - Date.now(); },
    now() { return Date.now() + this.offset; },
  };

  /**
   * Cronômetro progressivo exibido em um elemento.
   * @param {HTMLElement} node  elemento que mostra o tempo
   * @param {(s:number)=>string} format  função de formatação
   */
  function createStopwatch(node, format) {
    let startedAt = null;
    let frozenSeconds = null;
    return {
      start(serverStart) { startedAt = serverStart; frozenSeconds = null; this.render(); },
      reset() { startedAt = null; frozenSeconds = null; node.textContent = format(0); },
      freeze() { frozenSeconds = this.seconds(); this.render(); },
      seconds() {
        if (frozenSeconds !== null) return frozenSeconds;
        if (startedAt === null) return 0;
        return Math.max(0, (serverClock.now() - startedAt) / 1000);
      },
      render() { node.textContent = format(this.seconds()); },
    };
  }

  let ticking = null;
  const watches = new Set();

  function track(watch) {
    watches.add(watch);
    if (!ticking) ticking = setInterval(() => watches.forEach((w) => w.render()), 250);
    return watch;
  }

  window.NMTimer = { serverClock, createStopwatch: (node, format) => track(createStopwatch(node, format)) };
})();
