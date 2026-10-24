export interface PomodoroCfg { focusMin: number; shortMin: number; longMin: number; cycles: number }
export const DEFAULT_POMODORO: PomodoroCfg = { focusMin: 25, shortMin: 5, longMin: 15, cycles: 4 }

const clamp = (n: unknown, min: number, max: number, fb: number) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb }
export function sanitizeCfg(raw: Partial<PomodoroCfg> | undefined): PomodoroCfg {
  const r = raw ?? {}
  return { focusMin: clamp(r.focusMin, 1, 180, 25), shortMin: clamp(r.shortMin, 1, 60, 5), longMin: clamp(r.longMin, 1, 120, 15), cycles: clamp(r.cycles, 2, 10, 4) }
}
/** Depois de `completedToday` pomodoros concluídos hoje: a cada `cycles` vem a pausa longa. */
export function nextBreak(completedToday: number, cfg: PomodoroCfg): { kind: 'short' | 'long'; minutes: number } {
  const long = completedToday > 0 && completedToday % cfg.cycles === 0
  return { kind: long ? 'long' : 'short', minutes: long ? cfg.longMin : cfg.shortMin }
}
