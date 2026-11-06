import { run, get, del, all, getSetting, setSetting, uid } from './db.js'
import { startTimer, pauseTimer, resumeTimer, finishTimer } from './core/timerCore.js'
import { sanitizeCfg, nextBreak } from './core/pomodoroCore.js'
import { startOfLocalDay, endOfLocalDay } from './core/statsCore.js'

/* ---------- sessão de estudo ativa ---------- */
const KEY = 'activeSession'
export const getActive = () => getSetting(KEY, undefined)
const mutate = (key, fn, opts) => run(['settings'], 'readwrite', async (x) => { const r = await x.get('settings', key); if (r) await x.put('settings', { key, value: fn(r.value) }) }, opts)

/** Só existe uma sessão ativa: se já houver uma (outra aba, clique duplo), devolve a existente. */
export const startSession = (opts, now = Date.now()) => run(['settings'], 'readwrite', async (x) => {
  const cur = await x.get('settings', KEY)
  if (cur) return cur.value
  const a = { state: startTimer(uid(), now), ...opts, lastSeenAt: now }
  await x.put('settings', { key: KEY, value: a })
  return a
})
export const pauseSession = (now = Date.now()) => mutate(KEY, (a) => ({ ...a, state: pauseTimer(a.state, now), lastSeenAt: now }))
export const resumeSession = (now = Date.now()) => mutate(KEY, (a) => ({ ...a, state: resumeTimer(a.state, now), lastSeenAt: now }))
export const heartbeat = (now = Date.now()) => mutate(KEY, (a) => ({ ...a, lastSeenAt: now }), { silent: true })
export const setNotes = (notes) => mutate(KEY, (a) => ({ ...a, notes }), { silent: true })
export const cancelSession = () => del('settings', KEY)
/** `at` permite finalizar no último momento visto (sessão abandonada). id estável: finalizar duas vezes não duplica. */
export const finishSession = (now = Date.now(), at) => run(['settings', 'sessions'], 'readwrite', async (x) => {
  const r = await x.get('settings', KEY)
  if (!r) return
  const a = r.value
  const f = finishTimer(a.state, at ?? now)
  await x.put('sessions', { ...f, subjectId: a.subjectId, taskId: a.taskId, mediaId: a.mediaId, kind: a.kind, notes: a.notes, origin: 'local' })
  await x.del('settings', KEY)
})

/* ---------- pausa do Pomodoro (não conta como estudo) ---------- */
const BKEY = 'activeBreak'
export const getBreak = () => getSetting(BKEY, undefined)
export const cancelBreak = () => del('settings', BKEY)
export async function startBreakAfterPomodoro(now = Date.now()) {
  const cfg = sanitizeCfg(await getSetting('pomodoro', {}))
  const from = startOfLocalDay(now), to = endOfLocalDay(now)
  const done = (await all('sessions')).filter((s) => s.kind === 'pomodoro' && s.endedAt !== undefined && s.endedAt >= from && s.endedAt < to).length
  const b = nextBreak(done, cfg)
  const ab = { kind: b.kind, durationMs: b.minutes * 60_000, endsAt: now + b.minutes * 60_000 }
  await setSetting(BKEY, ab)
  return ab
}

/* ---------- leitura (separada do estudo) ---------- */
const RKEY = 'activeReading'
export const getReading = () => getSetting(RKEY, undefined)
export const startReading = (bookId, startPage, now = Date.now()) => run(['settings'], 'readwrite', async (x) => {
  const cur = await x.get('settings', RKEY)
  if (cur) return cur.value
  const a = { state: startTimer(uid(), now), bookId, startPage, lastSeenAt: now }
  await x.put('settings', { key: RKEY, value: a })
  return a
})
export const pauseReading = (now = Date.now()) => mutate(RKEY, (a) => ({ ...a, state: pauseTimer(a.state, now), lastSeenAt: now }))
export const resumeReading = (now = Date.now()) => mutate(RKEY, (a) => ({ ...a, state: resumeTimer(a.state, now), lastSeenAt: now }))
export const heartbeatReading = (now = Date.now()) => mutate(RKEY, (a) => ({ ...a, lastSeenAt: now }), { silent: true })
export const cancelReading = () => del('settings', RKEY)
export const finishReading = (endPage, notes, now = Date.now()) => run(['settings', 'readingSessions', 'books'], 'readwrite', async (x) => {
  const r = await x.get('settings', RKEY)
  if (!r) return
  const a = r.value
  const f = finishTimer(a.state, now)
  await x.put('readingSessions', { ...f, bookId: a.bookId, startPage: a.startPage, endPage, notes: (notes || '').trim() || undefined, origin: 'local' })
  const book = await x.get('books', a.bookId)
  if (book && endPage !== undefined) {
    const done = book.totalPages !== undefined && endPage >= book.totalPages
    await x.put('books', { ...book, currentPage: endPage, startedAt: book.startedAt ?? a.state.startedAt, ...(done ? { status: 'done', finishedAt: now } : { status: book.status === 'want' ? 'reading' : book.status }) })
  }
  await x.del('settings', RKEY)
})

/* ---------- avisos do navegador (só com a aba aberta) ---------- */
export async function enableNotifications() {
  if (typeof Notification === 'undefined') return 'unsupported'
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  return p === 'granted' ? 'granted' : 'denied'
}
export function notify(title, body) {
  try { if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(title, { body }) } catch { /* bloqueado */ }
}
export { get }
