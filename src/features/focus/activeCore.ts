import type { TimerState } from './timerCore'

export interface ActiveSession {
  state: TimerState
  kind: 'free' | 'pomodoro' | 'countdown'
  subjectId?: string
  taskId?: string
  mediaId?: string
  targetMs?: number
  notes?: string
  lastSeenAt: number // atualizado por um "batimento" enquanto alguma aba está aberta
}
export const ABANDON_AFTER_MS = 30 * 60_000

/** Sessão rodando (não pausada) sem nenhuma aba aberta há mais de 30 min é considerada abandonada. */
export function isAbandoned(a: { state: TimerState; lastSeenAt: number }, now: number): boolean {
  const running = !a.state.pauses.some((p) => p.end === undefined)
  return running && now - a.lastSeenAt > ABANDON_AFTER_MS
}

export function formatClock(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const mm = String(m).padStart(2, '0'), rr = String(r).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${rr}` : `${mm}:${rr}`
}
