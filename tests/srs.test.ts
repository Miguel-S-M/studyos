import { describe, expect, it } from 'vitest'
import { cardStats, isDueToday, newCardState, review } from '../src/features/memory-lab/srsCore'

const now = new Date(2026, 9, 23, 15).getTime()
const day = (n: number) => new Date(2026, 9, 23 + n).getTime()
describe('repetição espaçada', () => {
  it('cartão novo vence hoje', () => expect(isDueToday(newCardState(now), now)).toBe(true))
  it('fácil: 3 dias, depois cresce pelo ease', () => {
    const a = review(newCardState(now), 'easy', now)
    expect(a.intervalDays).toBe(3); expect(a.dueAt).toBe(day(3)); expect(a.ease).toBe(2.6)
    expect(review(a, 'easy', now).intervalDays).toBe(Math.round(3 * 2.6))
  })
  it('parcial: 1 dia, depois cresce pelo menos 1 dia', () => {
    const a = review(newCardState(now), 'partial', now)
    expect(a.intervalDays).toBe(1)
    expect(review(a, 'partial', now).intervalDays).toBe(2)
  })
  it('difícil: reaprende em 10 min, conta lapso e reduz ease sem passar de 1,3', () => {
    let s = review(review(newCardState(now), 'easy', now), 'hard', now)
    expect(s.intervalDays).toBe(0); expect(s.reps).toBe(0); expect(s.lapses).toBe(1); expect(s.dueAt).toBe(now + 600_000)
    for (let i = 0; i < 20; i++) s = review(s, 'hard', now)
    expect(s.ease).toBe(1.3)
  })
  it('cartão agendado para amanhã não está na fila de hoje; estatísticas contam atrasados', () => {
    const tomorrow = review(newCardState(now), 'partial', now)
    expect(isDueToday(tomorrow, now)).toBe(false)
    const st = cardStats([{ state: tomorrow }, { state: { ...newCardState(now), dueAt: day(-2) } }, { state: newCardState(now) }], now)
    expect(st).toMatchObject({ total: 3, dueToday: 2, overdue: 1, unseen: 2 })
  })
})
