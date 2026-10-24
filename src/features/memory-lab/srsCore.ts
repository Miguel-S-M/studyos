// Regras de repetição espaçada (simplificação do SM-2). Documentadas aqui e testadas em tests/srs.test.ts.
//  difícil  -> reaprender: intervalo 0, volta em 10 min, ease -0.20 (mín. 1,3), lapso +1
//  parcial  -> intervalo 1 dia na 1ª vez; depois cresce 20% (pelo menos +1 dia); ease -0.05
//  fácil    -> 3 dias na 1ª vez; depois intervalo x ease (pelo menos +1 dia); ease +0.10 (máx. 3,0)
// Cartões com intervalo >= 1 dia vencem no INÍCIO do dia agendado (evita depender da hora da revisão).
import { endOfLocalDay, startOfLocalDay } from '../dashboard/statsCore'

export type Rating = 'hard' | 'partial' | 'easy'
export interface CardState { ease: number; intervalDays: number; reps: number; lapses: number; dueAt: number }

const r2 = (n: number) => Math.round(n * 100) / 100
export const newCardState = (now: number): CardState => ({ ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: now })

function addDays(now: number, n: number): number {
  const d = new Date(startOfLocalDay(now)); d.setDate(d.getDate() + n); return d.getTime()
}

export function review(s: CardState, rating: Rating, now: number): CardState {
  if (rating === 'hard') return { ease: Math.max(1.3, r2(s.ease - 0.2)), intervalDays: 0, reps: 0, lapses: s.lapses + 1, dueAt: now + 10 * 60_000 }
  const reps = s.reps + 1
  if (rating === 'partial') {
    const iv = reps === 1 ? 1 : Math.max(s.intervalDays + 1, Math.round(s.intervalDays * 1.2))
    return { ease: Math.max(1.3, r2(s.ease - 0.05)), intervalDays: iv, reps, lapses: s.lapses, dueAt: addDays(now, iv) }
  }
  const iv = reps === 1 ? 3 : Math.max(s.intervalDays + 1, Math.round(s.intervalDays * s.ease))
  return { ease: Math.min(3, r2(s.ease + 0.1)), intervalDays: iv, reps, lapses: s.lapses, dueAt: addDays(now, iv) }
}

export const isDueToday = (s: CardState, now: number) => s.dueAt < endOfLocalDay(now)

/** "Maduro" só descreve o intervalo agendado; não afirma que o assunto foi dominado. */
export function cardStats(cards: { state: CardState }[], now: number) {
  const today = startOfLocalDay(now)
  return {
    total: cards.length,
    dueToday: cards.filter((c) => isDueToday(c.state, now)).length,
    overdue: cards.filter((c) => c.state.dueAt < today).length,
    mature: cards.filter((c) => c.state.reps >= 3 && c.state.intervalDays >= 21).length,
    difficult: cards.filter((c) => c.state.lapses >= 2 || c.state.ease <= 1.6).length,
    unseen: cards.filter((c) => c.state.reps === 0 && c.state.lapses === 0).length,
  }
}

/** "Lembrou" = parcial ou fácil. Só descreve as suas avaliações; não mede domínio do assunto. */
export function reviewSummary(events: { at: number; rating: Rating }[], from: number) {
  const e = events.filter((x) => x.at >= from)
  const remembered = e.filter((x) => x.rating !== 'hard').length
  return { total: e.length, remembered, hard: e.length - remembered, pct: e.length ? Math.round((remembered / e.length) * 100) : undefined }
}
