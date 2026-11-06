import { h, btn, field, select, askConfirm, downloadText } from '../ui.js'
import { load, run, put, uid } from '../db.js'
import { exportBackup } from '../backup.js'
import { cardStats, isDueToday, newCardState, review, reviewSummary } from '../core/srsCore.js'

const st = { reviewing: false, revealed: false, q: '', editing: null }
export default async function (ctx) {
  const D = await load('flashcards', 'subjects', 'books', 'reviewEvents')
  const now = Date.now(), stats = cardStats(D.flashcards, now)
  const queue = D.flashcards.filter((c) => isDueToday(c.state, now)).sort((a, b) => a.state.dueAt - b.state.dueAt)

  if (st.reviewing) {
    const c = queue[0]
    const rate = async (rating) => {
      const next = review(c.state, rating, Date.now()); st.revealed = false
      await run(['flashcards', 'reviewEvents'], 'readwrite', async (x) => { await x.put('flashcards', { ...c, state: next }); await x.put('reviewEvents', { id: uid(), cardId: c.id, at: Date.now(), rating, intervalDays: next.intervalDays }) })
    }
    return h('div', { class: 'stack narrow' }, h('div', { class: 'row between' }, h('h1', { style: 'margin:0' }, 'Revisão'), btn('Sair', () => { st.reviewing = false; st.revealed = false; ctx.rerender() })),
      !c ? h('p', { class: 'ember', role: 'status' }, 'Fila de hoje concluída. Você pode voltar amanhã para os próximos cartões.') : [
        h('p', { class: 'muted small num' }, `${queue.length} na fila`),
        h('section', { class: 'card' }, h('p', { style: 'white-space:pre-wrap;font-size:1.2rem' }, c.front),
          st.revealed ? h('div', { style: 'border-top:1px solid var(--g6);margin-top:1rem;padding-top:1rem' }, h('p', { class: 'ember', style: 'white-space:pre-wrap' }, c.back), c.source ? h('p', { class: 'muted small' }, `Fonte: ${c.source}`) : null) : null),
        !st.revealed ? btn('Mostrar resposta', () => { st.revealed = true; ctx.rerender() }, 'primary') : h('div', { class: 'row' }, btn('Difícil', () => rate('hard')), btn('Parcial', () => rate('partial')), btn('Fácil', () => rate('easy'), 'primary'))])
  }

  const front = h('textarea', { 'aria-label': 'Frente (pergunta)', placeholder: 'Frente: pergunta' }), back = h('textarea', { 'aria-label': 'Verso (resposta)', placeholder: 'Verso: resposta' })
  const subj = select([['', 'Sem matéria'], ...D.subjects.filter((s) => !s.archived).map((s) => [s.id, s.name])], '', { 'aria-label': 'Matéria' })
  const book = select([['', 'Sem livro'], ...D.books.map((b) => [b.id, b.title])], '', { 'aria-label': 'Livro' })
  const source = h('input', { 'aria-label': 'Fonte', placeholder: 'Fonte ou página (opcional)' })
  const add = async (e) => {
    e.preventDefault()
    if (!front.value.trim() || !back.value.trim()) return
    await put('flashcards', { id: uid(), front: front.value.trim(), back: back.value.trim(), subjectId: subj.value || undefined, bookId: book.value || undefined, source: source.value.trim() || undefined, tags: [], createdAt: Date.now(), state: newCardState(Date.now()) })
  }
  const r = reviewSummary(D.reviewEvents, now - 30 * 86_400_000)
  const shown = D.flashcards.filter((c) => !st.q || `${c.front} ${c.back}`.toLowerCase().includes(st.q.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt)
  const stat = (l, v) => h('div', { class: 'card' }, h('p', { class: 'muted small' }, l), h('p', { class: 'big', style: 'font-size:1.6rem' }, v))
  const item = (c) => {
    if (st.editing === c.id) {
      const f = h('textarea', { 'aria-label': 'Frente' }, c.front), b = h('textarea', { 'aria-label': 'Verso' }, c.back)
      return h('li', { class: 'card stack' }, f, b, h('div', { class: 'row' }, btn('Salvar', async () => { if (f.value.trim() && b.value.trim()) await put('flashcards', { ...c, front: f.value.trim(), back: b.value.trim() }); st.editing = null; ctx.rerender() }, 'link'), btn('Cancelar', () => { st.editing = null; ctx.rerender() }, 'link')))
    }
    return h('li', { class: 'card' }, h('p', { style: 'white-space:pre-wrap' }, c.front), c.bookId ? h('p', { class: 'tag' }, `Livro: ${D.books.find((x) => x.id === c.bookId)?.title ?? 'removido'}`) : null,
      h('p', { class: 'muted small num' }, c.state.reps === 0 && c.state.lapses === 0 ? 'Novo' : `intervalo ${c.state.intervalDays} d · próxima ${new Date(c.state.dueAt).toLocaleDateString('pt-BR')}`),
      h('div', { class: 'row' }, btn('Editar', () => { st.editing = c.id; ctx.rerender() }, 'link'), btn('Apagar', () => { if (askConfirm('Apagar este cartão e seu histórico de revisões?')) run(['flashcards', 'reviewEvents'], 'readwrite', async (x) => { await x.del('flashcards', c.id); for (const e of await x.all('reviewEvents')) if (e.cardId === c.id) await x.del('reviewEvents', e.id) }) }, 'link danger')))
  }
  return h('div', { class: 'stack wide' }, h('h1', null, 'Laboratório de memória'),
    h('div', { class: 'grid' }, stat('Para hoje', stats.dueToday), stat('Atrasados', stats.overdue), stat('Difíceis', stats.difficult), stat('Intervalo ≥ 21 dias', stats.mature), stat('Total', stats.total)),
    h('p', { class: 'muted small num' }, r.total === 0 ? 'Nenhuma revisão nos últimos 30 dias.' : `Últimos 30 dias: ${r.total} revisões; você marcou parcial ou fácil em ${r.pct}% e difícil em ${r.hard}.`),
    btn(queue.length ? `Revisar ${queue.length} cartões` : 'Nada para revisar hoje', () => { st.reviewing = true; ctx.rerender() }, 'primary', queue.length ? {} : { disabled: true }),
    h('form', { class: 'stack', onsubmit: add }, front, back, h('div', { class: 'row' }, subj, book, h('div', { style: 'flex:1;min-width:8rem' }, source), btn('Adicionar cartão', null, 'primary', { type: 'submit' }))),
    h('div', { class: 'row' }, btn('Exportar só os cartões', async () => downloadText(`studyos-cartoes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportBackup(['flashcards', 'reviewEvents']), null, 2), 'application/json'), '', D.flashcards.length ? {} : { disabled: true }),
      h('span', { class: 'muted small' }, 'Para importar, use "Importar JSON" em Configurações.')),
    h('input', { id: 'q-mem', type: 'search', 'aria-label': 'Pesquisar cartões', placeholder: 'Pesquisar cartões', value: st.q, oninput: (e) => { st.q = e.target.value; clearTimeout(st.t); st.t = setTimeout(ctx.rerender, 250) } }),
    D.flashcards.length === 0 ? h('p', { class: 'muted' }, 'Nenhum cartão ainda. Crie o primeiro acima ou a partir de um insight.') : null, h('ul', { class: 'plain' }, shown.map(item)))
}
