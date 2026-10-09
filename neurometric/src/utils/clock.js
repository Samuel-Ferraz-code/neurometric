/**
 * Relógio do servidor. Todos os tempos do teste vêm daqui, nunca do navegador.
 * Nos testes automatizados usamos um relógio controlável para simular minutos passando.
 */
const systemClock = { now: () => Date.now() };

function createFakeClock(start = Date.UTC(2026, 9, 9, 15, 0, 0)) {
  let current = start;
  return {
    now: () => current,
    advance(ms) { current += ms; return current; },
    set(ms) { current = ms; },
  };
}

module.exports = { systemClock, createFakeClock };
