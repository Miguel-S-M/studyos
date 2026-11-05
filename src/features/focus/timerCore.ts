// Núcleo puro dos cronômetros: sem React, sem relógio global. Tudo recebe `now`.
// O tempo focado é DERIVADO de timestamps (início, pausas, fim), nunca de um contador.
export interface Pause { start: number; end?: number }
export interface TimerState {
  id: string
  startedAt: number
  endedAt?: number
  pauses: Pause[]
}

export const startTimer = (id: string, now: number): TimerState => ({ id, startedAt: now, pauses: [] })
export const isPaused = (s: TimerState) => s.pauses.some((p) => p.end === undefined)
export const isFinished = (s: TimerState) => s.endedAt !== undefined

export function pauseTimer(s: TimerState, now: number): TimerState {
  if (isFinished(s) || isPaused(s)) return s // idempotente: clique duplo não cria 2 pausas
  return { ...s, pauses: [...s.pauses, { start: Math.max(now, s.startedAt) }] }
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  if (isFinished(s) || !isPaused(s)) return s
  return { ...s, pauses: s.pauses.map((p) => (p.end === undefined ? { ...p, end: Math.max(now, p.start) } : p)) }
}

export function finishTimer(s: TimerState, now: number): TimerState {
  if (isFinished(s)) return s
  const closed = resumeTimer(s, now)
  return { ...closed, endedAt: Math.max(now, s.startedAt) }
}

export function pausedMs(s: TimerState, now: number): number {
  const stop = s.endedAt ?? now
  return s.pauses.reduce((sum, p) => sum + Math.max(0, Math.min(p.end ?? stop, stop) - p.start), 0)
}

/** Tempo focado = tempo decorrido - pausas. Nunca negativo (relógio do sistema pode voltar). */
export function focusedMs(s: TimerState, now: number): number {
  const stop = s.endedAt ?? now
  return Math.max(0, stop - s.startedAt - pausedMs(s, now))
}

export const remainingMs = (s: TimerState, targetMs: number, now: number) =>
  Math.max(0, targetMs - focusedMs(s, now))
