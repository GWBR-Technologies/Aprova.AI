const STEPS_MS = [3_000, 5_000, 8_000, 13_000, 20_000, 30_000];
const GIVE_UP_AFTER_MS = 5 * 60_000;

/**
 * Intervalo até a próxima consulta periódica de um recurso em processamento, ou `false` quando
 * passaram 5 minutos sem conclusão. `attempt` é o número de consultas já concluídas (com dado
 * ou com erro). Depois do último degrau o intervalo se mantém em 30 s.
 */
export function nextPollInterval(attempt: number): number | false {
  const last = STEPS_MS.length - 1;
  const stepsTaken = Math.min(attempt, STEPS_MS.length);
  const elapsed =
    STEPS_MS.slice(0, stepsTaken).reduce((total, step) => total + step, 0) +
    Math.max(0, attempt - STEPS_MS.length) * STEPS_MS[last];
  if (elapsed >= GIVE_UP_AFTER_MS) return false;
  return STEPS_MS[Math.min(attempt, last)];
}
