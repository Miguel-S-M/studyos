import { onChange } from './db.js'
import { h } from './ui.js'

window.__studyos = true
const VERSION = 'site estático 1'

const ROUTES = [
  ['', 'Dashboard', () => import('./views/dashboard.js')],
  ['foco', 'Foco', () => import('./views/focus.js')],
  ['materias', 'Matérias', () => import('./views/subjects.js')],
  ['tarefas', 'Tarefas', () => import('./views/tasks.js')],
  ['historico', 'Histórico', () => import('./views/history.js')],
  ['calendario', 'Calendário', () => import('./views/calendar.js')],
  ['estatisticas', 'Estatísticas', () => import('./views/stats.js')],
  ['memoria', 'Memória', () => import('./views/memory.js')],
  ['insights', 'Insights', () => import('./views/insights.js')],
  ['biblioteca', 'Biblioteca', () => import('./views/library.js')],
  ['midia', 'Mídia', () => import('./views/media.js')],
  ['holo', 'Holo', () => import('./views/holo.js')],
  ['config', 'Configurações', () => import('./views/settings.js')],
].map(([key, label, load]) => ({ key, label, load }))

const nav = document.getElementById('nav'), main = document.getElementById('main')
nav.append(h('span', { class: 'brand' }, 'StudyOS'), ...ROUTES.map((r) => h('a', { href: `#/${r.key}`, 'data-key': r.key }, r.label)), h('span', { class: 'muted small ver' }, VERSION))

let token = 0, cleanups = [], lastKey = null, timer = null, dirty = false

async function render() {
  const my = ++token
  cleanups.forEach((f) => f()); cleanups = []
  const key = location.hash.replace(/^#\/?/, '')
  const route = ROUTES.find((r) => r.key === key) || ROUTES[0]
  nav.querySelectorAll('a').forEach((a) => a.setAttribute('aria-current', a.dataset.key === route.key ? 'page' : 'false'))
  document.title = 'StudyOS'
  const ctx = { rerender: () => schedule(), interval(fn, ms) { if (my !== token) return; const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)) } }
  const y = window.scrollY, same = lastKey === route.key
  const ae = document.activeElement, keepId = ae && ae.id && main.contains(ae) ? ae.id : null, caret = keepId ? ae.selectionStart : null
  try {
    const el = await (await route.load()).default(ctx)
    if (my !== token) return
    main.replaceChildren(el)
  } catch (e) {
    if (my !== token) return
    main.replaceChildren(h('p', { class: 'error', role: 'alert' }, `Erro ao carregar a página: ${e && e.message ? e.message : e}`))
  }
  lastKey = route.key
  if (keepId) { const n = document.getElementById(keepId); if (n) { n.focus(); try { n.setSelectionRange(caret, caret) } catch { /* campo sem cursor */ } } }
  window.scrollTo(0, same ? y : 0)
}
const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 30) }
const typing = () => { const a = document.activeElement; return a && main.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) }

window.addEventListener('hashchange', render)
// Mudanças feitas por outra aba não interrompem quem está digitando; a tela atualiza ao sair do campo.
onChange(({ remote }) => { if (remote && typing()) dirty = true; else schedule() })
document.addEventListener('focusout', () => { if (dirty) { dirty = false; schedule() } })
render()

try { navigator.storage && navigator.storage.persist && navigator.storage.persist() } catch { /* opcional */ }
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {})
