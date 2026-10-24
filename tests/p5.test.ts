import { describe, expect, it } from 'vitest'
import { comparePeriods } from '../src/features/dashboard/statsCore'
import { reviewSummary } from '../src/features/memory-lab/srsCore'
import { dayCell, weekDays } from '../src/features/calendar/calendarCore'

describe('comparação entre períodos', () => {
  it('calcula a variação percentual', () => {
    const d = [{ ms: 100 }, { ms: 100 }, { ms: 150 }, { ms: 150 }]
    expect(comparePeriods(d, 2)).toEqual({ current: 300, previous: 200, pct: 50 })
  })
  it('sem período anterior não inventa percentual', () => expect(comparePeriods([{ ms: 0 }, { ms: 0 }, { ms: 90 }, { ms: 10 }], 2).pct).toBeUndefined())
})
describe('resumo das revisões', () => {
  it('conta só o período e separa difícil de lembrado', () => {
    const e = [{ at: 1, rating: 'easy' as const }, { at: 100, rating: 'hard' as const }, { at: 100, rating: 'partial' as const }, { at: 100, rating: 'easy' as const }]
    expect(reviewSummary(e, 50)).toEqual({ total: 3, remembered: 2, hard: 1, pct: 67 })
    expect(reviewSummary([], 0).pct).toBeUndefined()
  })
})
describe('semana', () => {
  it('vai de domingo a sábado e contém o dia', () => {
    const t = new Date(2026, 9, 21, 15).getTime() // quarta
    const w = weekDays(t)
    expect(w).toHaveLength(7)
    expect(new Date(w[0].from).getDay()).toBe(0); expect(new Date(w[6].from).getDay()).toBe(6)
    expect(w.some((c) => c.from <= t && t < c.to)).toBe(true)
    expect(dayCell(t).to - dayCell(t).from).toBeGreaterThan(22 * 3_600_000)
  })
})
