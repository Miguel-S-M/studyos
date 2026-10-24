import { describe, expect, it } from 'vitest'
import { hourDistribution } from '../src/features/dashboard/statsCore'

const MIN = 60_000
const at = (h: number, m = 0) => new Date(2026, 9, 20, h, m).getTime()
describe('distribuição por hora', () => {
  it('divide a sessão entre as horas que ela atravessa', () => {
    const d = hourDistribution([{ id: 'a', startedAt: at(10, 30), endedAt: at(12, 15), pauses: [] }], at(23))
    expect([d[10], d[11], d[12], d[9], d[13]]).toEqual([30 * MIN, 60 * MIN, 15 * MIN, 0, 0])
  })
  it('não conta pausas', () => {
    const d = hourDistribution([{ id: 'a', startedAt: at(10, 30), endedAt: at(12, 15), pauses: [{ start: at(11), end: at(11, 20) }] }], at(23))
    expect(d[11]).toBe(40 * MIN)
  })
  it('soma sessões de dias diferentes na mesma hora', () => {
    const day2 = (h: number) => new Date(2026, 9, 21, h).getTime()
    const d = hourDistribution([{ id: 'a', startedAt: at(20), endedAt: at(21), pauses: [] }, { id: 'b', startedAt: day2(20), endedAt: day2(21), pauses: [] }], at(23))
    expect(d[20]).toBe(120 * MIN)
  })
})
