import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/services/storage/db'
import { DEFAULT_POMODORO, nextBreak, sanitizeCfg } from '../src/features/focus/pomodoroCore'
import { startBreakAfterPomodoro } from '../src/features/focus/breakService'
import { fromInput, toInput, validateRange } from '../src/features/history/manualCore'
import { monthGrid } from '../src/features/calendar/calendarCore'

beforeEach(async () => { await db.settings.clear(); await db.sessions.clear() })
describe('Pomodoro em ciclos', () => {
  it('pausa curta, e longa a cada 4 pomodoros', () => {
    expect([1, 2, 3, 4, 5, 8].map((n) => nextBreak(n, DEFAULT_POMODORO).kind)).toEqual(['short', 'short', 'short', 'long', 'short', 'long'])
    expect(nextBreak(0, DEFAULT_POMODORO).kind).toBe('short')
  })
  it('limita valores absurdos da configuração', () => {
    expect(sanitizeCfg({ focusMin: 9999, shortMin: -3, longMin: NaN as never, cycles: 1 })).toEqual({ focusMin: 180, shortMin: 1, longMin: 15, cycles: 2 })
  })
  it('a pausa depende dos pomodoros concluídos hoje e não vira sessão', async () => {
    const n = Date.now()
    for (let i = 0; i < 4; i++) await db.sessions.add({ id: `p${i}`, startedAt: n - 1000 - i, endedAt: n - 500, pauses: [], kind: 'pomodoro', origin: 'local' })
    const b = await startBreakAfterPomodoro(n)
    expect(b.kind).toBe('long'); expect(b.durationMs).toBe(15 * 60_000)
    expect(await db.sessions.count()).toBe(4)
  })
})
describe('sessão manual', () => {
  const now = new Date(2026, 9, 23, 15).getTime()
  it('valida intervalos', () => {
    expect(validateRange(now - 3600_000, now, now)).toBeNull()
    expect(validateRange(now, now - 1, now)).toMatch(/depois do início/)
    expect(validateRange(now - 3600_000, now + 1, now)).toMatch(/futuro/)
    expect(validateRange(now - 25 * 3600_000, now, now)).toMatch(/24 horas/)
    expect(validateRange(NaN, now, now)).toMatch(/Informe/)
  })
  it('converte de e para datetime-local sem mudar o horário', () => { expect(fromInput(toInput(now))).toBe(now) })
})
describe('calendário', () => {
  it('outubro de 2026: 31 dias, semanas completas, 1º é quinta', () => {
    const g = monthGrid(2026, 9)
    expect(g.every((w) => w.length === 7)).toBe(true)
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(31)
    expect(g[0].findIndex((c) => c.inMonth && c.day === 1)).toBe(4)
  })
  it('cada dia dura até a meia-noite seguinte', () => {
    const c = monthGrid(2026, 9).flat().find((x) => x.inMonth && x.day === 10)!
    expect(new Date(c.to).getDate()).toBe(11)
  })
})
