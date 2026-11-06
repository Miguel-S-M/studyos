import { h, btn, field, select, askConfirm, progress } from '../ui.js'
import { load, put, del, uid, run, getSetting, setSetting } from '../db.js'
import { getReading, startReading, pauseReading, resumeReading, finishReading, cancelReading, heartbeatReading } from '../services.js'
import { progressPct, pagesRead, readingSummary } from '../core/readingCore.js'
import { groupBooks, moveBefore } from '../core/shelfCore.js'
import { fileToCover } from '../core/coverUtil.js'
import { endOfLocalDay, startOfLocalDay, formatDuration } from '../core/statsCore.js'
import { focusedMs, isPaused } from '../core/timerCore.js'
import { formatClock, isAbandoned } from '../core/activeCore.js'

const STATUS = { want: 'Quero ler', reading: 'Lendo', paused: 'Pausado', done: 'Concluído', dropped: 'Abandonado' }
const FORMAT = { physical: 'Físico', digital: 'Digital', audio: 'Audiolivro' }
const st = { view: 'shelf', groupBy: 'shelf', flipped: null, endPage: '', notes: '' }
const opts = (o) => Object.entries(o)
const spine = (t) => { let x = 0; for (const c of t) x = (x * 31 + c.charCodeAt(0)) % 360; return `hsl(${x} 35% 26%)` }

export default async function (ctx) {
  const [D, active, shelves] = await Promise.all([load('books', 'readingSessions'), getReading(), getSetting('shelves', [])])
  const now = Date.now()
  const week = readingSummary(D.readingSessions, startOfLocalDay(now) - 6 * 86_400_000, endOfLocalDay(now), now)
  return h('div', { class: 'stack wide' }, h('h1', null, 'Biblioteca'),
    active ? readingPanel(ctx, active, D) : null,
    h('p', { class: 'muted num' }, `Leitura nos últimos 7 dias: ${formatDuration(week.ms)} e ${week.pages} páginas registradas (separado do tempo de estudo)`),
    addForm(),
    D.books.length === 0 ? h('p', { class: 'muted' }, 'Nenhum livro ainda. Adicione o primeiro acima; não é preciso consulta online.') : [
      h('div', { class: 'row' }, h('div', { class: 'seg', role: 'group', 'aria-label': 'Modo de exibição' }, [['shelf', 'Estante'], ['list', 'Lista']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(st.view === v), onclick: () => { st.view = v; ctx.rerender() } }, l))),
        st.view === 'shelf' ? select([['shelf', 'Minhas estantes'], ['author', 'Por autor'], ['series', 'Por obra / coleção'], ['status', 'Por estado de leitura']], st.groupBy, { 'aria-label': 'Organizar por', onchange: (e) => { st.groupBy = e.target.value; ctx.rerender() } }) : null),
      st.view === 'shelf' ? shelfView(ctx, D.books, shelves, !!active) : listView(ctx, D, !!active, now)])
}

function addForm() {
  const title = h('input', { 'aria-label': 'Título', placeholder: 'Título do livro', maxlength: 200 }), author = h('input', { 'aria-label': 'Autor', placeholder: 'Autor' })
  const series = h('input', { 'aria-label': 'Obra ou coleção', placeholder: 'Obra / coleção (opcional)' }), total = h('input', { type: 'number', min: 1, 'aria-label': 'Total de páginas', placeholder: 'Total de páginas' })
  const format = select(opts(FORMAT), 'physical', { 'aria-label': 'Formato' }), status = select(opts(STATUS), 'want', { 'aria-label': 'Estado' })
  const cover = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Capa' }), err = h('p', { class: 'error', role: 'alert' })
  return h('form', { class: 'grid', onsubmit: async (e) => {
    e.preventDefault()
    if (!title.value.trim()) return
    let img
    if (cover.files[0]) { try { img = await fileToCover(cover.files[0]) } catch (x) { err.textContent = x.message; return } }
    await put('books', { id: uid(), cover: img, series: series.value.trim() || undefined, title: title.value.trim(), author: author.value.trim() || undefined, format: format.value, totalPages: total.value ? Math.max(1, Number(total.value)) : undefined, currentPage: 0, status: status.value, tags: [], createdAt: Date.now() })
  } }, title, author, series, total, format, status, field('Capa (opcional)', cover), err, btn('Adicionar livro', null, 'primary', { type: 'submit' }))
}

function readingPanel(ctx, a, D) {
  const book = D.books.find((b) => b.id === a.bookId)
  const timeEl = h('p', { class: 'huge', role: 'timer' }), info = h('p', { class: 'muted small' })
  const tick = () => { timeEl.textContent = formatClock(focusedMs(a.state, Date.now())); info.textContent = isPaused(a.state) ? 'Pausado — a pausa não conta como leitura.' : `Desde a página ${a.startPage ?? '?'}` }
  tick(); ctx.interval(tick, 500); ctx.interval(() => heartbeatReading(), 30_000)
  const endPage = h('input', { type: 'number', min: 0, 'aria-label': 'Página final', placeholder: 'Página em que parou', value: st.endPage, oninput: (e) => { st.endPage = e.target.value } })
  const notes = h('input', { 'aria-label': 'Nota da sessão', placeholder: 'Nota da sessão (opcional)', value: st.notes, oninput: (e) => { st.notes = e.target.value } })
  const end = () => (st.endPage === '' ? undefined : Number(st.endPage))
  return h('section', { class: 'card hot', 'aria-label': 'Leitura em andamento' },
    isAbandoned(a, Date.now()) ? h('div', { class: 'card late', role: 'alert' }, h('p', null, `Esta leitura ficou sem nenhuma aba aberta desde ${new Date(a.lastSeenAt).toLocaleTimeString('pt-BR')}. O que fazer?`),
      h('div', { class: 'row' }, btn('Finalizar no último momento visto', () => finishReading(end(), st.notes, a.lastSeenAt), 'primary'), btn('Continuar leitura', () => heartbeatReading().then(() => ctx.rerender())), btn('Descartar', () => { if (askConfirm('Descartar esta leitura sem salvar?')) cancelReading() }))) : null,
    h('p', { class: 'muted small' }, 'Lendo agora'), h('p', null, h('strong', null, book ? book.title : 'Livro removido')), timeEl, info,
    h('div', { class: 'grid' }, endPage, notes),
    h('div', { class: 'row' }, isPaused(a.state) ? btn('Retomar', () => resumeReading(), 'primary') : btn('Pausar', () => pauseReading()),
      btn('Finalizar e salvar', async () => { await finishReading(end(), st.notes); st.endPage = ''; st.notes = '' }, 'primary'), btn('Cancelar', () => { if (askConfirm('Cancelar sem salvar esta leitura?')) cancelReading() })))
}

function listView(ctx, D, readingActive, now) {
  return h('ul', { class: 'plain' }, [...D.books].sort((a, b) => b.createdAt - a.createdAt).map((b) => {
    const pct = progressPct(b.currentPage, b.totalPages), sess = D.readingSessions.filter((s) => s.bookId === b.id), pages = sess.reduce((t, s) => t + (pagesRead(s) ?? 0), 0)
    const today = b.pageGoalDaily ? readingSummary(sess, startOfLocalDay(now), endOfLocalDay(now), now).pages : 0
    const upd = (patch) => put('books', { ...b, ...patch })
    return h('li', { class: 'card' }, b.cover ? h('img', { src: b.cover, alt: `Capa de ${b.title}`, style: 'float:right;margin-left:.5rem;height:4rem;border-radius:4px' }) : null,
      h('p', null, h('strong', null, b.title), b.author ? h('span', { class: 'muted' }, ` — ${b.author}`) : null),
      h('p', { class: 'muted small num' }, `${FORMAT[b.format]} · ${sess.length} sessões · ${formatDuration(sess.reduce((t, s) => t + focusedMs(s, now), 0))} · ${pages} páginas registradas`),
      pct !== undefined ? progress(pct, `Progresso de ${b.title}`) : null,
      b.pageGoalDaily ? h('p', { class: 'muted small num' }, `Hoje: ${today} de ${b.pageGoalDaily} páginas`) : null, b.comment ? h('p', { class: 'small', style: 'font-style:italic' }, `“${b.comment}”`) : null,
      h('div', { class: 'row', style: 'margin-top:.5rem' },
        select([['', 'Sem nota'], ...[1, 2, 3, 4, 5].map((n) => [n, '★'.repeat(n)])], b.rating ?? '', { 'aria-label': `Nota de ${b.title}`, onchange: (e) => upd({ rating: e.target.value ? Number(e.target.value) : undefined }) }),
        select(opts(STATUS), b.status, { 'aria-label': 'Estado', onchange: (e) => upd({ status: e.target.value, ...(e.target.value === 'done' ? { finishedAt: Date.now() } : {}) }) }),
        h('label', { class: 'row small muted' }, 'Página', h('input', { type: 'number', min: 0, value: b.currentPage, style: 'width:5rem', onchange: (e) => upd({ currentPage: Math.max(0, Number(e.target.value) || 0) }) }), b.totalPages ? `de ${b.totalPages}` : ''),
        h('label', { class: 'row small muted' }, 'Meta págs/dia', h('input', { type: 'number', min: 0, max: 2000, value: b.pageGoalDaily ?? '', style: 'width:5rem', onchange: (e) => upd({ pageGoalDaily: Math.min(2000, Math.max(0, Math.round(Number(e.target.value) || 0))) || undefined }) })),
        h('input', { 'aria-label': `Comentário sobre ${b.title}`, placeholder: 'Comentário', maxlength: 500, value: b.comment ?? '', style: 'flex:1;min-width:8rem', onchange: (e) => upd({ comment: e.target.value.trim() || undefined }) }),
        btn('Ler agora', () => startReading(b.id, b.currentPage), '', readingActive ? { disabled: true } : {}),
        btn('Apagar', () => { if (askConfirm('Apagar o livro e suas sessões de leitura?')) run(['books', 'readingSessions'], 'readwrite', async (x) => { await x.del('books', b.id); for (const s of await x.all('readingSessions')) if (s.bookId === b.id) await x.del('readingSessions', s.id) }) }, 'link danger')))
  }))
}

function shelfView(ctx, books, shelves, readingActive) {
  let dragId = null
  const groups = groupBooks(books, st.groupBy, shelves), msg = h('p', { class: 'error', role: 'alert' }), cards = new Map()
  const writeOrder = (ids, extra) => run(['books'], 'readwrite', async (x) => { for (let i = 0; i < ids.length; i++) { const b = await x.get('books', ids[i]); if (b) await x.put('books', { ...b, shelfOrder: i, ...(extra && extra[ids[i]] ? extra[ids[i]] : {}) }) } })
  async function drop(groupKey, beforeId) {
    const id = dragId; dragId = null
    const target = groups.find((g) => g.key === groupKey)
    if (!id || !target) return
    const same = target.books.some((b) => b.id === id)
    if (!same && st.groupBy !== 'shelf') { msg.textContent = 'Neste modo as estantes são automáticas: só dá para reordenar dentro do mesmo grupo. Use "Minhas estantes" para mover entre estantes.'; return }
    msg.textContent = ''
    await writeOrder(moveBefore(target.books.map((b) => b.id), id, beforeId), same ? undefined : { [id]: { shelf: groupKey || undefined } })
  }
  const nudge = (ids, id, dir) => { const i = ids.indexOf(id), j = i + dir; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; return writeOrder(ids) }
  const setFlipped = (id) => { st.flipped = id; for (const [bid, c] of cards) { const open = bid === id; c.el.classList.toggle('open', open); c.back.inert = !open; c.front.tabIndex = open ? -1 : 0; c.el.draggable = !open } }
  const shelfIn = h('input', { 'aria-label': 'Nome da nova estante', placeholder: 'Nova estante (ex.: Favoritos)', maxlength: 40 })

  function bookEl(b, g) {
    const upd = (patch) => put('books', { ...b, ...patch }), ids = g.books.map((x) => x.id), pct = progressPct(b.currentPage, b.totalPages)
    const front = h('button', { type: 'button', class: 'face front', 'aria-label': `Virar o livro ${b.title}`, style: `background:${b.cover ? '#000' : spine(b.title)}`, onclick: () => setFlipped(b.id) },
      b.cover ? h('img', { src: b.cover, alt: `Capa de ${b.title}`, draggable: 'false' }) : [h('span', { class: 't' }, b.title), h('span', { class: 'a' }, b.author ?? '')])
    const coverIn = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'sr', onchange: async (e) => { const f = e.target.files[0]; if (!f) return; try { await upd({ cover: await fileToCover(f) }); msg.textContent = '' } catch (x) { msg.textContent = x.message } } })
    const back = h('div', { class: 'face backf' }, h('strong', null, b.title),
      h('input', { 'aria-label': 'Autor', placeholder: 'Autor', value: b.author ?? '', onchange: (e) => upd({ author: e.target.value.trim() || undefined }) }),
      h('input', { 'aria-label': 'Obra ou coleção', placeholder: 'Obra / coleção', value: b.series ?? '', onchange: (e) => upd({ series: e.target.value.trim() || undefined }) }),
      select([['', 'Sem estante'], ...shelves.map((s) => [s, s])], b.shelf ?? '', { 'aria-label': 'Estante', onchange: (e) => upd({ shelf: e.target.value || undefined }) }),
      h('p', { class: 'muted num' }, `${b.currentPage}${b.totalPages ? ` de ${b.totalPages}` : ''} págs.${pct !== undefined ? ` (${pct}%)` : ''}`),
      h('div', { class: 'row', style: 'gap:.25rem' }, btn('◀', () => nudge(ids, b.id, -1), '', { 'aria-label': 'Mover para a esquerda' }), btn('▶', () => nudge(ids, b.id, 1), '', { 'aria-label': 'Mover para a direita' }),
        btn('Ler', () => startReading(b.id, b.currentPage), '', readingActive ? { disabled: true } : {}), h('label', { class: 'btn' }, 'Capa', coverIn), b.cover ? btn('Sem capa', () => upd({ cover: undefined })) : null, btn('Voltar', () => setFlipped(null))))
    const el = h('div', { class: 'book' }, h('div', { class: 'flip' }, front, back))
    cards.set(b.id, { el, front, back })
    el.draggable = true
    el.addEventListener('dragstart', (e) => { dragId = b.id; try { e.dataTransfer.setData('text/plain', b.id); e.dataTransfer.effectAllowed = 'move' } catch { /* sem dataTransfer */ } el.classList.add('drag') })
    el.addEventListener('dragend', () => { dragId = null; el.classList.remove('drag') })
    el.addEventListener('dragover', (e) => { if (dragId) e.preventDefault() })
    el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); drop(g.key, b.id) })
    return el
  }
  const root = h('div', { class: 'stack' },
    st.groupBy === 'shelf' ? h('form', { class: 'row', onsubmit: async (e) => { e.preventDefault(); const n = shelfIn.value.trim().slice(0, 40); if (!n || shelves.some((s) => s.toLocaleLowerCase() === n.toLocaleLowerCase())) return; await setSetting('shelves', [...shelves, n]) } }, h('div', { style: 'flex:1;min-width:8rem' }, shelfIn), btn('Criar estante', null, '', { type: 'submit' })) : null,
    h('p', { class: 'muted small' }, `Clique num livro para virá-lo. Arraste para reordenar${st.groupBy === 'shelf' ? ' ou mover entre estantes' : ''}; no celular, use as setas e o seletor no verso do livro.`), msg,
    groups.map((g) => {
      const sec = h('section', { class: 'shelf', 'aria-label': `Estante: ${g.label}` },
        h('h3', { class: 'row between', style: 'margin-bottom:.5rem' }, h('span', null, `${g.label} `, h('span', { class: 'muted small num' }, `(${g.books.length})`)),
          st.groupBy === 'shelf' && g.key ? btn('Remover estante', async () => { if (!askConfirm(`Remover a estante "${g.key}"? Os livros não serão apagados; voltam para "Sem estante".`)) return
            await run(['books', 'settings'], 'readwrite', async (x) => { for (const b of await x.all('books')) if (b.shelf === g.key) await x.put('books', { ...b, shelf: undefined }); await x.put('settings', { key: 'shelves', value: shelves.filter((s) => s !== g.key) }) }) }, 'link') : null),
        h('div', { class: 'books' }, g.books.length === 0 ? h('p', { class: 'muted small' }, 'Estante vazia. Arraste um livro para cá.') : g.books.map((b) => bookEl(b, g))))
      sec.addEventListener('dragover', (e) => { if (dragId) e.preventDefault() }); sec.addEventListener('drop', (e) => { e.preventDefault(); drop(g.key) })
      return sec
    }))
  if (st.flipped && cards.has(st.flipped)) setFlipped(st.flipped); else for (const [, c] of cards) c.back.inert = true
  return root
}
