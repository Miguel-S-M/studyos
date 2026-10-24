import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/services/storage/db'
import { pagesRead, progressPct, readingSummary } from '../src/features/library/readingCore'
import { finishReading, getActiveReading, pauseReading, resumeReading, startReading } from '../src/features/library/readingService'
import { focusedMs } from '../src/features/focus/timerCore'

const MIN = 60_000
beforeEach(async () => { await db.settings.clear(); await db.books.clear(); await db.readingSessions.clear() })
const book = { id: 'b1', title: 'Livro', format: 'physical' as const, totalPages: 100, currentPage: 10, status: 'want' as const, tags: [], createdAt: 1 }

describe('leitura', () => {
  it('páginas lidas só quando os dados permitem', () => {
    expect(pagesRead({ startPage: 10, endPage: 25 })).toBe(15)
    expect(pagesRead({ startPage: 10 })).toBeUndefined()
    expect(pagesRead({ startPage: 30, endPage: 20 })).toBeUndefined()
    expect(progressPct(50, 200)).toBe(25); expect(progressPct(5)).toBeUndefined()
  })
  it('timer: uma leitura ativa, pausa fora do tempo, salva uma vez e atualiza o livro', async () => {
    await db.books.add(book)
    await Promise.all([startReading('b1', 10, 0), startReading('b1', 10, 3)])
    await pauseReading(10 * MIN); await resumeReading(15 * MIN)
    await finishReading(40, ' capítulo 3 ', 30 * MIN); await finishReading(50, undefined, 31 * MIN)
    const all = await db.readingSessions.toArray()
    expect(all).toHaveLength(1)
    expect(focusedMs(all[0], 99 * MIN)).toBe(25 * MIN)
    expect(all[0].notes).toBe('capítulo 3')
    expect(await getActiveReading()).toBeUndefined()
    expect(await db.books.get('b1')).toMatchObject({ currentPage: 40, status: 'reading' })
  })
  it('chegar à última página conclui o livro', async () => {
    await db.books.add(book); await startReading('b1', 90, 0); await finishReading(100, undefined, MIN)
    expect((await db.books.get('b1'))?.status).toBe('done')
  })
  it('resumo soma tempo e páginas do período', () => {
    const s = { id: 'a', startedAt: 0, endedAt: 60 * MIN, pauses: [], startPage: 1, endPage: 21 }
    expect(readingSummary([s], 0, 24 * 60 * MIN, 0)).toEqual({ ms: 60 * MIN, pages: 20 })
  })
})
