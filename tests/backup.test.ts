import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db } from '../src/services/storage/db'
import { exportBackup, importBackup, parseBackup } from '../src/services/storage/backup'

describe('backup JSON', () => {
  it('rejeita JSON inválido e estrutura errada com mensagem clara', () => {
    expect(parseBackup('{oops').ok).toBe(false)
    const r = parseBackup(JSON.stringify({ app: 'studyos', version: 1, exportedAt: 1, subjects: [{ id: 'x' }], tasks: [], sessions: [], settings: [] }))
    expect(r.ok).toBe(false)
  })
  it('exporta, importa duas vezes sem duplicar e sem perder dados existentes', async () => {
    await db.subjects.clear(); await db.sessions.clear()
    await db.subjects.add({ id: 'm1', name: 'Física', color: '#fff', archived: false, createdAt: 1 })
    await db.sessions.add({ id: 's1', startedAt: 1, pauses: [], kind: 'free', origin: 'local' })
    const parsed = parseBackup(JSON.stringify(await exportBackup(5)))
    if (!parsed.ok) throw new Error(parsed.error)
    await db.subjects.add({ id: 'm2', name: 'Química', color: '#000', archived: false, createdAt: 2 })
    await importBackup(parsed.data); await importBackup(parsed.data)
    expect(await db.subjects.count()).toBe(2)
    expect(await db.sessions.count()).toBe(1)
  })
})
