import { db } from '../../services/storage/db'
import { finishTimer, pauseTimer, resumeTimer, startTimer, type TimerState } from '../focus/timerCore'

const KEY = 'activeReading'
export interface ActiveReading { state: TimerState; bookId: string; startPage?: number; lastSeenAt: number }
export const getActiveReading = async () => (await db.settings.get(KEY))?.value as ActiveReading | undefined

async function mutate(fn: (a: ActiveReading) => ActiveReading) {
  await db.transaction('rw', db.settings, async () => {
    const a = await getActiveReading()
    if (a) await db.settings.put({ key: KEY, value: fn(a) })
  })
}
export function startReading(bookId: string, startPage: number | undefined, now = Date.now()) {
  return db.transaction('rw', db.settings, async () => {
    const cur = await getActiveReading()
    if (cur) return cur
    const a: ActiveReading = { state: startTimer(crypto.randomUUID(), now), bookId, startPage, lastSeenAt: now }
    await db.settings.put({ key: KEY, value: a })
    return a
  })
}
export const pauseReading = (now = Date.now()) => mutate((a) => ({ ...a, state: pauseTimer(a.state, now), lastSeenAt: now }))
export const resumeReading = (now = Date.now()) => mutate((a) => ({ ...a, state: resumeTimer(a.state, now), lastSeenAt: now }))
export const cancelReading = () => db.settings.delete(KEY)

/** Salva a sessão, atualiza a página atual do livro e, ao chegar na última página, marca como concluído. */
export function finishReading(endPage: number | undefined, notes: string | undefined, now = Date.now()) {
  return db.transaction('rw', db.settings, db.readingSessions, db.books, async () => {
    const a = await getActiveReading()
    if (!a) return
    const f = finishTimer(a.state, now)
    await db.readingSessions.put({ ...f, bookId: a.bookId, startPage: a.startPage, endPage, notes: notes?.trim() || undefined, origin: 'local' })
    const book = await db.books.get(a.bookId)
    if (book && endPage !== undefined) {
      const done = book.totalPages !== undefined && endPage >= book.totalPages
      await db.books.update(a.bookId, { currentPage: endPage, startedAt: book.startedAt ?? a.state.startedAt, ...(done ? { status: 'done' as const, finishedAt: now } : { status: book.status === 'want' ? 'reading' as const : book.status }) })
    }
    await db.settings.delete(KEY)
  })
}
export const heartbeatReading = (now = Date.now()) => mutate((a) => ({ ...a, lastSeenAt: now }))
