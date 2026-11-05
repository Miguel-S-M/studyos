import type { TimerState } from '../focus/timerCore'

export const startOfLocalDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
export const endOfLocalDay = (t: number) => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime() }

/** Tempo focado de uma sessão dentro de [from, to): recorta sessões que cruzam a meia-noite e desconta pausas. */
export function focusedMsInWindow(s: TimerState, from: number, to: number, now: number): number {
  const realStop = s.endedAt ?? now
  const start = Math.max(s.startedAt, from)
  const stop = Math.min(realStop, to)
  if (stop <= start) return 0
  const paused = s.pauses.reduce((sum, p) => {
    const a = Math.max(p.start, start)
    const b = Math.min(p.end ?? realStop, stop)
    return sum + Math.max(0, b - a)
  }, 0)
  return Math.max(0, stop - start - paused)
}

export function todaySummary(sessions: TimerState[], now: number) {
  const from = startOfLocalDay(now), to = endOfLocalDay(now)
  const focusedMs = sessions.reduce((sum, s) => sum + focusedMsInWindow(s, from, to, now), 0)
  const completed = sessions.filter((s) => s.endedAt !== undefined && s.endedAt >= from && s.endedAt < to).length
  return { focusedMs, completed }
}

export function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}

export interface Range { from: number; to: number }
/** Últimos `days` dias locais (o mais antigo primeiro). Usa limites de dia local, então é seguro com horário de verão. */
export function dayRanges(now: number, days: number): Range[] {
  const out: Range[] = []
  let from = startOfLocalDay(now)
  for (let i = 0; i < days; i++) {
    out.unshift({ from, to: endOfLocalDay(from) })
    from = startOfLocalDay(from - 1)
  }
  return out
}

export function dailyTotals(sessions: TimerState[], days: number, now: number) {
  return dayRanges(now, days).map((r) => ({ ...r, ms: sessions.reduce((t, s) => t + focusedMsInWindow(s, r.from, r.to, now), 0) }))
}

export function totalsBySubject(sessions: (TimerState & { subjectId?: string })[], from: number, to: number, now: number) {
  const map = new Map<string | undefined, number>()
  for (const s of sessions) {
    const ms = focusedMsInWindow(s, from, to, now)
    if (ms > 0) map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + ms)
  }
  return map
}

/** Dias seguidos com foco. Se hoje ainda não tem foco, a sequência de ontem continua valendo. */
export function currentStreak(sessions: TimerState[], now: number, lookback = 365): number {
  const d = dailyTotals(sessions, lookback, now).reverse()
  let i = d[0].ms === 0 ? 1 : 0, n = 0
  for (; i < d.length && d[i].ms > 0; i++) n++
  return n
}

/** Tempo focado (sem pausas) por hora do dia local, somando todas as sessões. Índice 0 a 23. */
export function hourDistribution(sessions: TimerState[], now: number): number[] {
  const out = new Array<number>(24).fill(0)
  for (const s of sessions) {
    const stop = s.endedAt ?? now
    const h = new Date(s.startedAt); h.setMinutes(0, 0, 0)
    while (h.getTime() < stop) {
      const from = h.getTime()
      const nextD = new Date(h); nextD.setHours(nextD.getHours() + 1)
      const next = nextD.getTime() > from ? nextD.getTime() : from + 3_600_000
      out[h.getHours()] += focusedMsInWindow(s, from, next, now)
      h.setTime(next)
    }
  }
  return out
}

/** Compara o período atual (últimos `days` dias) com o anterior de mesmo tamanho. `daily` deve ter 2*days dias. */
export function comparePeriods(daily: { ms: number }[], days: number) {
  const sum = (a: { ms: number }[]) => a.reduce((t, d) => t + d.ms, 0)
  const current = sum(daily.slice(-days)), previous = sum(daily.slice(-2 * days, -days))
  return { current, previous, pct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : undefined }
}
