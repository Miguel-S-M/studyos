import { db } from '../../services/storage/db'
import type { ActiveSession } from './activeCore'
import { finishTimer, pauseTimer, resumeTimer, startTimer } from './timerCore'

const KEY = 'activeSession'
export const getActive = async () => (await db.settings.get(KEY))?.value as ActiveSession | undefined

async function mutate(fn: (a: ActiveSession) => ActiveSession) {
  await db.transaction('rw', db.settings, async () => {
    const a = await getActive()
    if (a) await db.settings.put({ key: KEY, value: fn(a) })
  })
}

/** Só existe uma sessão ativa: se já houver uma (outra aba, clique duplo), devolve a existente. */
export function startSession(opts: { kind: ActiveSession['kind']; subjectId?: string; taskId?: string; mediaId?: string; targetMs?: number }, now = Date.now()) {
  return db.transaction('rw', db.settings, async () => {
    const cur = await getActive()
    if (cur) return cur
    const a: ActiveSession = { state: startTimer(crypto.randomUUID(), now), ...opts, lastSeenAt: now }
    await db.settings.put({ key: KEY, value: a })
    return a
  })
}
export const pauseSession = (now = Date.now()) => mutate((a) => ({ ...a, state: pauseTimer(a.state, now), lastSeenAt: now }))
export const resumeSession = (now = Date.now()) => mutate((a) => ({ ...a, state: resumeTimer(a.state, now), lastSeenAt: now }))
export const heartbeat = (now = Date.now()) => mutate((a) => ({ ...a, lastSeenAt: now }))
export const setNotes = (notes: string) => mutate((a) => ({ ...a, notes }))

/** `at` permite finalizar no último momento visto (sessão abandonada). O id estável evita duplicar o registro. */
export function finishSession(now = Date.now(), at?: number) {
  return db.transaction('rw', db.settings, db.sessions, async () => {
    const a = await getActive()
    if (!a) return
    const f = finishTimer(a.state, at ?? now)
    await db.sessions.put({ ...f, subjectId: a.subjectId, taskId: a.taskId, mediaId: a.mediaId, kind: a.kind, notes: a.notes, origin: 'local' })
    await db.settings.delete(KEY)
  })
}
export const cancelSession = () => db.settings.delete(KEY)
