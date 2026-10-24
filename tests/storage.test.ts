import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { StudyDB, getSetting } from '../src/services/storage/db'

describe('armazenamento local (IndexedDB)', () => {
  it('persiste sessões e reabre o banco com os dados', async () => {
    const a = new StudyDB('t1')
    await a.sessions.put({ id: 's1', startedAt: 1, pauses: [], kind: 'free', origin: 'local' })
    a.close()
    const b = new StudyDB('t1')
    expect((await b.sessions.get('s1'))?.id).toBe('s1')
    expect(await getSetting('dailyGoalMin', 120)).toBe(120)
  })
})
