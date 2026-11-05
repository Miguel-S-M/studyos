import { describe, expect, it } from 'vitest'
import { currentStreak, dailyTotals, dayRanges, totalsBySubject } from '../src/features/dashboard/statsCore'

const H = 3_600_000
const now = new Date(2026, 9, 23, 15).getTime()
const day = (n: number, h = 10) => new Date(2026, 9, 23 - n, h).getTime()
const sess = (n: number, subjectId?: string) => ({ id: String(n), startedAt: day(n), endedAt: day(n) + H, pauses: [], subjectId })

describe('estatísticas por período', () => {
  it('gera N dias locais em ordem crescente', () => {
    const r = dayRanges(now, 7)
    expect(r).toHaveLength(7)
    expect(r[6].to - r[6].from).toBeGreaterThan(22 * H)
    expect(r[0].from).toBeLessThan(r[1].from)
  })
  it('soma por dia', () => {
    const t = dailyTotals([sess(0), sess(2)], 3, now)
    expect(t.map((d) => d.ms)).toEqual([H, 0, H])
  })
  it('sequência: conta até ontem se hoje está vazio, e quebra no primeiro dia sem foco', () => {
    expect(currentStreak([sess(1), sess(2), sess(4)], now)).toBe(2)
    expect(currentStreak([sess(0), sess(1)], now)).toBe(2)
    expect(currentStreak([], now)).toBe(0)
  })
  it('totais por matéria', () => {
    const m = totalsBySubject([sess(0, 'a'), sess(1, 'a'), sess(1, 'b')], day(1, 0), day(0, 0) + 24 * H, now)
    expect(m.get('a')).toBe(2 * H)
    expect(m.get('b')).toBe(H)
  })
})
