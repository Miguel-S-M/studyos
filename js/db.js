// IndexedDB sem bibliotecas. Todos os dados ficam neste navegador.
const STORES = { subjects: 'id', tasks: 'id', sessions: 'id', flashcards: 'id', reviewEvents: 'id', insights: 'id', books: 'id', readingSessions: 'id', media: 'id', settings: 'key' }
export const STORE_NAMES = Object.keys(STORES)
let dbp
function open() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('studyos-site', 1)
    r.onupgradeneeded = () => { for (const [n, k] of Object.entries(STORES)) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: k }) }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error || new Error('Não foi possível abrir o armazenamento do navegador.'))
    r.onblocked = () => rej(new Error('Feche as outras abas do StudyOS e recarregue.'))
  })
  return dbp
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('studyos') : null
const emit = (remote) => window.dispatchEvent(new CustomEvent('studyos:data', { detail: { remote } }))
if (bc) bc.onmessage = () => emit(true)
export const onChange = (fn) => window.addEventListener('studyos:data', (e) => fn(e.detail))

/** Transação: fn recebe {get, all, put, del, clear}. Várias operações dentro dela são atômicas. */
export async function run(names, mode, fn, opts = {}) {
  const d = await open()
  return new Promise((resolve, reject) => {
    const t = d.transaction(names, mode)
    const st = (s) => t.objectStore(s)
    const api = { get: (s, k) => req(st(s).get(k)), all: (s) => req(st(s).getAll()), put: (s, o) => req(st(s).put(o)), del: (s, k) => req(st(s).delete(k)), clear: (s) => req(st(s).clear()) }
    let out
    fn(api).then((v) => { out = v }, (e) => { try { t.abort() } catch { /* já encerrada */ } reject(e) })
    t.oncomplete = () => { if (mode === 'readwrite' && !opts.silent) { emit(false); bc && bc.postMessage(1) } resolve(out) }
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error('Operação cancelada.'))
  })
}
export const all = (s) => run([s], 'readonly', (x) => x.all(s))
export const get = (s, k) => run([s], 'readonly', (x) => x.get(s, k))
export const put = (s, o, opts) => run([s], 'readwrite', (x) => x.put(s, o), opts)
export const del = (s, k) => run([s], 'readwrite', (x) => x.del(s, k))
export const bulkPut = (s, arr) => run([s], 'readwrite', async (x) => { for (const o of arr) await x.put(s, o) })
export async function load(...names) {
  return run(names, 'readonly', async (x) => { const o = {}; for (const n of names) o[n] = await x.all(n); return o })
}
export const clearAll = () => run(STORE_NAMES, 'readwrite', async (x) => { for (const s of STORE_NAMES) await x.clear(s) })
export async function getSetting(k, fb) { const r = await get('settings', k); return r ? r.value : fb }
export const setSetting = (k, v, opts) => put('settings', { key: k, value: v }, opts)
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10))
