import { h, btn, select } from '../ui.js'
import { load, put, del, uid } from '../db.js'
import { newCardState } from '../core/srsCore.js'
import { askConfirm } from '../ui.js'

const KINDS = { quote: 'Citação literal', idea: 'Ideia com minhas palavras', learning: 'Aprendizado', application: 'Aplicação prática', question: 'Pergunta ou dúvida', relation: 'Relação com outra obra ou matéria', summary: 'Resumo pessoal' }
const st = { q: '', kind: '', fav: false }
export default async function (ctx) {
  const D = await load('insights', 'subjects', 'books')
  const kind = select(Object.entries(KINDS), 'idea', { 'aria-label': 'Tipo' })
  const content = h('textarea', { 'aria-label': 'Conteúdo', placeholder: 'Conteúdo', style: 'min-height:6rem' })
  const source = h('input', { 'aria-label': 'Fonte', placeholder: 'Fonte (obrigatória em citações, se não escolher livro)' })
  const page = h('input', { type: 'number', min: 1, 'aria-label': 'Página', placeholder: 'Página' })
  const subj = select([['', 'Sem matéria'], ...D.subjects.filter((s) => !s.archived).map((s) => [s.id, s.name])], '', { 'aria-label': 'Matéria' })
  const book = select([['', 'Sem livro'], ...D.books.map((b) => [b.id, b.title])], '', { 'aria-label': 'Livro' })
  const tags = h('input', { 'aria-label': 'Tags', placeholder: 'Tags separadas por vírgula' })
  const err = h('p', { class: 'error', role: 'alert' })
  const add = async (e) => {
    e.preventDefault()
    if (!content.value.trim()) { err.textContent = 'Escreva o conteúdo do insight.'; return }
    const b = D.books.find((x) => x.id === book.value), src = source.value.trim() || (b ? b.title : '')
    if (kind.value === 'quote' && !src) { err.textContent = 'Citações literais precisam de uma fonte (obra, autor ou link).'; return }
    await put('insights', { id: uid(), kind: kind.value, content: content.value.trim(), subjectId: subj.value || undefined, bookId: book.value || undefined, source: src || undefined, page: page.value ? Number(page.value) : undefined,
      tags: tags.value.split(',').map((t) => t.trim()).filter(Boolean), favorite: false, createdAt: Date.now(), aiGenerated: false })
  }
  const toCard = async (i) => {
    const front = (prompt('Pergunta para a frente do cartão (o insight será o verso):') || '').trim()
    if (!front) return
    await put('flashcards', { id: uid(), front, back: i.content, subjectId: i.subjectId, bookId: i.bookId, source: i.source, insightId: i.id, tags: i.tags, createdAt: Date.now(), state: newCardState(Date.now()) })
    alert('Cartão criado no Laboratório de memória.')
  }
  const list = D.insights.filter((i) => (!st.kind || i.kind === st.kind) && (!st.fav || i.favorite) && (!st.q || `${i.content} ${i.source ?? ''} ${i.tags.join(' ')}`.toLowerCase().includes(st.q.toLowerCase()))).sort((a, b) => b.createdAt - a.createdAt)
  return h('div', { class: 'stack wide' }, h('h1', null, 'Insights e notas'),
    h('form', { class: 'stack', onsubmit: add }, kind, content, h('div', { class: 'grid' }, source, page, subj, book, tags), err, btn('Salvar insight', null, 'primary', { type: 'submit' })),
    h('div', { class: 'row' }, h('input', { id: 'q-ins', type: 'search', 'aria-label': 'Pesquisar', placeholder: 'Pesquisar', value: st.q, style: 'flex:1;min-width:8rem', oninput: (e) => { st.q = e.target.value; clearTimeout(st.t); st.t = setTimeout(ctx.rerender, 250) } }),
      select([['', 'Todos os tipos'], ...Object.entries(KINDS)], st.kind, { 'aria-label': 'Filtrar tipo', onchange: (e) => { st.kind = e.target.value; ctx.rerender() } }),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: st.fav, onchange: (e) => { st.fav = e.target.checked; ctx.rerender() } }), 'Favoritos')),
    list.length === 0 ? h('p', { class: 'muted' }, 'Nenhum insight encontrado. Registre o primeiro acima.') : null,
    h('ul', { class: 'plain' }, list.map((i) => h('li', { class: 'card' }, h('p', { class: 'tag' }, KINDS[i.kind]), h('p', { style: 'white-space:pre-wrap;margin:.25rem 0' }, i.kind === 'quote' ? `“${i.content}”` : i.content),
      h('p', { class: 'muted small num' }, [i.source, i.page && `p. ${i.page}`, D.subjects.find((s) => s.id === i.subjectId)?.name, D.books.find((b) => b.id === i.bookId)?.title, i.tags.join(', ')].filter(Boolean).join(' · ')),
      h('div', { class: 'row' }, btn(i.favorite ? 'Desfavoritar' : 'Favoritar', () => put('insights', { ...i, favorite: !i.favorite }), 'link'), btn('Criar flashcard', () => toCard(i), 'link'), btn('Apagar', () => { if (askConfirm('Apagar este insight?')) del('insights', i.id) }, 'link danger'))))))
}
