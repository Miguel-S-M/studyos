import { describe, expect, it } from 'vitest'
import { finishTimer, focusedMs, pauseTimer, remainingMs, resumeTimer, startTimer } from '../src/features/focus/timerCore'

const MIN = 60_000
describe('timerCore', () => {
  it('exclui pausas do tempo focado', () => {
    let s = startTimer('a', 0)
    s = pauseTimer(s, 10 * MIN)
    s = resumeTimer(s, 15 * MIN)
    s = finishTimer(s, 30 * MIN)
    expect(focusedMs(s, 99 * MIN)).toBe(25 * MIN)
  })
  it('pausa e retomada são idempotentes', () => {
    let s = pauseTimer(pauseTimer(startTimer('a', 0), 5 * MIN), 6 * MIN)
    expect(s.pauses).toHaveLength(1)
    s = resumeTimer(resumeTimer(s, 8 * MIN), 9 * MIN)
    expect(s.pauses[0].end).toBe(8 * MIN)
  })
  it('finalizar durante pausa fecha a pausa', () => {
    const s = finishTimer(pauseTimer(startTimer('a', 0), 10 * MIN), 20 * MIN)
    expect(focusedMs(s, 50 * MIN)).toBe(10 * MIN)
  })
  it('sessão recuperada após reload continua correta (só depende de timestamps)', () => {
    const s = JSON.parse(JSON.stringify(pauseTimer(startTimer('a', 0), 10 * MIN)))
    expect(focusedMs(s, 60 * MIN)).toBe(10 * MIN)
  })
  it('relógio que volta não gera tempo negativo; contagem regressiva', () => {
    const s = startTimer('a', 100 * MIN)
    expect(focusedMs(s, 50 * MIN)).toBe(0)
    expect(remainingMs(startTimer('b', 0), 25 * MIN, 10 * MIN)).toBe(15 * MIN)
  })
})
