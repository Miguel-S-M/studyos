import { describe, expect, it } from 'vitest'
import { focusedMsInWindow, todaySummary } from '../src/features/dashboard/statsCore'

const H = 3_600_000
describe('statsCore', () => {
  it('recorta sessão que cruza a meia-noite', () => {
    const s = { id: 'a', startedAt: 22 * H, endedAt: 26 * H, pauses: [] }
    expect(focusedMsInWindow(s, 0, 24 * H, 30 * H)).toBe(2 * H)
    expect(focusedMsInWindow(s, 24 * H, 48 * H, 30 * H)).toBe(2 * H)
  })
  it('desconta pausas dentro da janela', () => {
    const s = { id: 'a', startedAt: 0, endedAt: 4 * H, pauses: [{ start: 1 * H, end: 2 * H }] }
    expect(focusedMsInWindow(s, 0, 24 * H, 5 * H)).toBe(3 * H)
  })
  it('sessão ativa conta até agora', () => {
    const now = new Date(2026, 9, 23, 15).getTime()
    const s = { id: 'a', startedAt: now - H, pauses: [] }
    expect(todaySummary([s], now)).toEqual({ focusedMs: H, completed: 0 })
  })
})
