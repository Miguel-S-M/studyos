import type { StudySession } from '../../services/storage/db'
import { focusedMs, pausedMs } from '../focus/timerCore'

/** Escapa células CSV e neutraliza fórmulas (= + - @) para planilhas não executarem texto do usuário. */
export function csvCell(v: string | number | undefined): string {
  let s = v === undefined ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function sessionsToCsv(sessions: StudySession[], subjectName: (id?: string) => string, now: number): string {
  const head = ['inicio_utc', 'fim_utc', 'materia', 'tipo', 'foco_min', 'pausa_min', 'notas']
  const rows = sessions.map((s) => [
    new Date(s.startedAt).toISOString(),
    s.endedAt ? new Date(s.endedAt).toISOString() : '',
    subjectName(s.subjectId), s.kind,
    Math.round(focusedMs(s, now) / 600) / 100, Math.round(pausedMs(s, now) / 600) / 100, s.notes,
  ])
  return [head, ...rows].map((r) => r.map((c) => csvCell(c as string | number | undefined)).join(',')).join('\r\n')
}
