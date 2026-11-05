import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/services/storage/db'
import { ABANDON_AFTER_MS, formatClock, isAbandoned } from '../src/features/focus/activeCore'
import { cancelSession, finishSession, getActive, pauseSession, resumeSession, startSession } from '../src/features/focus/sessionService'
import { focusedMs } from '../src/features/focus/timerCore'

const MIN = 60_000
beforeEach(async () => { await db.settings.clear(); await db.sessions.clear() })

describe('sessão ativa', () => {
  it('iniciar duas vezes (duas abas) mantém uma só sessão', async () => {
    const [x, y] = await Promise.all([startSession({ kind: 'free' }, 0), startSession({ kind: 'free' }, 5)])
    expect(x.state.id).toBe(y.state.id)
  })
  it('sobrevive a "recarregar" e salva uma única vez ao finalizar', async () => {
    await startSession({ kind: 'free' }, 0)
    await pauseSession(10 * MIN); await resumeSession(15 * MIN)
    expect((await getActive())?.state.pauses).toHaveLength(1)
    await finishSession(30 * MIN); await finishSession(31 * MIN)
    const all = await db.sessions.toArray()
    expect(all).toHaveLength(1)
    expect(focusedMs(all[0], 99 * MIN)).toBe(25 * MIN)
    expect(await getActive()).toBeUndefined()
  })
  it('cancelar não salva', async () => {
    await startSession({ kind: 'free' }, 0); await cancelSession()
    expect(await db.sessions.count()).toBe(0)
  })
  it('detecta sessão abandonada e formata relógio', () => {
    const a = { state: { id: 'a', startedAt: 0, pauses: [] }, kind: 'free' as const, lastSeenAt: 0 }
    expect(isAbandoned(a, ABANDON_AFTER_MS + 1)).toBe(true)
    expect(isAbandoned(a, ABANDON_AFTER_MS - 1)).toBe(false)
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(65_000)).toBe('01:05')
  })
})
