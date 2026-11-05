// Leitura fica separada do estudo acadêmico: tabela e cálculos próprios (o mesmo período nunca é somado duas vezes).
import { focusedMsInWindow } from '../dashboard/statsCore'
import type { TimerState } from '../focus/timerCore'

export interface ReadingLike extends TimerState { startPage?: number; endPage?: number }

/** Só calcula quando os dois números existem e a página final não é menor que a inicial. */
export function pagesRead(s: { startPage?: number; endPage?: number }): number | undefined {
  return s.startPage !== undefined && s.endPage !== undefined && s.endPage >= s.startPage ? s.endPage - s.startPage : undefined
}

export function progressPct(current: number, total?: number): number | undefined {
  return total && total > 0 ? Math.min(100, Math.round((current / total) * 100)) : undefined
}

export function readingSummary(sessions: ReadingLike[], from: number, to: number, now: number) {
  let ms = 0, pages = 0
  for (const s of sessions) {
    ms += focusedMsInWindow(s, from, to, now)
    if (s.endedAt !== undefined && s.endedAt >= from && s.endedAt < to) pages += pagesRead(s) ?? 0
  }
  return { ms, pages }
}
