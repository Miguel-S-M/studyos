import { useState } from 'react'
import { db, type Insight, type InsightKind } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { newCardState } from '../memory-lab/srsCore'

const KINDS: Record<InsightKind, string> = {
  quote: 'Citação literal', idea: 'Ideia com minhas palavras', learning: 'Aprendizado', application: 'Aplicação prática',
  question: 'Pergunta ou dúvida', relation: 'Relação com outra obra ou matéria', summary: 'Resumo pessoal',
}
const field = 'rounded bg-graphite-800 p-2'

export function Insights() {
  const data = useLive(async () => ({ list: await db.insights.toArray(), subjects: await db.subjects.toArray(), books: await db.books.toArray() }))
  const [kind, setKind] = useState<InsightKind>('idea')
  const [content, setContent] = useState(''); const [source, setSource] = useState(''); const [page, setPage] = useState('')
  const [tags, setTags] = useState(''); const [subjectId, setSubjectId] = useState('')
  const [bookId, setBookId] = useState('')
  const [err, setErr] = useState('')
  const [q, setQ] = useState(''); const [fKind, setFKind] = useState(''); const [onlyFav, setOnlyFav] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return setErr('Escreva o conteúdo do insight.')
    const book = data.data?.books.find((b) => b.id === bookId)
    const src = source.trim() || book?.title || ''
    if (kind === 'quote' && !src) return setErr('Citações literais precisam de uma fonte (obra, autor ou link).')
    setErr('')
    await db.insights.add({
      id: crypto.randomUUID(), kind, content: content.trim(), subjectId: subjectId || undefined, source: src || undefined, bookId: bookId || undefined,
      page: page ? Number(page) : undefined, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), favorite: false, createdAt: Date.now(), aiGenerated: false,
    })
    setContent(''); setPage(''); setTags('')
  }
  async function toCard(i: Insight) {
    const front = prompt('Pergunta para a frente do cartão (o insight será o verso):')?.trim()
    if (!front) return
    await db.flashcards.add({ id: crypto.randomUUID(), front, back: i.content, subjectId: i.subjectId, source: i.source, insightId: i.id, bookId: i.bookId, tags: i.tags, createdAt: Date.now(), state: newCardState(Date.now()) })
    alert('Cartão criado no Laboratório de memória.')
  }

  if (data.error) return <p role="alert">Erro ao ler insights: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>
  const { subjects, books } = data.data
  const list = data.data.list.filter((i) => (!fKind || i.kind === fKind) && (!onlyFav || i.favorite)
    && (!q || `${i.content} ${i.source ?? ''} ${i.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Insights e notas</h1>
      <form onSubmit={add} className="grid gap-2">
        <select aria-label="Tipo" className={field} value={kind} onChange={(e) => setKind(e.target.value as InsightKind)}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <textarea aria-label="Conteúdo" className={`${field} h-24`} placeholder="Conteúdo" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="Fonte" className={field} placeholder={kind === 'quote' ? 'Fonte (obrigatória se não escolher livro)' : 'Fonte (opcional)'} value={source} onChange={(e) => setSource(e.target.value)} />
          <input aria-label="Página" type="number" min={1} className={`${field} num`} placeholder="Página" value={page} onChange={(e) => setPage(e.target.value)} />
          <select aria-label="Matéria" className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Sem matéria</option>{subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select aria-label="Livro" className={field} value={bookId} onChange={(e) => setBookId(e.target.value)}><option value="">Sem livro</option>{books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
          <input aria-label="Tags" className={field} placeholder="Tags separadas por vírgula" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        {err && <p role="alert" className="text-red-400">{err}</p>}
        <button className="rounded-md bg-ember px-4 py-2 font-medium text-ink">Salvar insight</button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Pesquisar" type="search" className={`${field} flex-1`} placeholder="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filtrar tipo" className={field} value={fKind} onChange={(e) => setFKind(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />Favoritos</label>
      </div>
      {list.length === 0 && <p className="text-mute">Nenhum insight encontrado. Registre o primeiro acima.</p>}
      <ul className="space-y-2">
        {list.map((i) => (
          <li key={i.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-3">
            <p className="text-sm text-copper-soft">{KINDS[i.kind]}{i.aiGenerated && ' (gerado por IA)'}</p>
            <p className="mt-1 whitespace-pre-wrap">{i.kind === 'quote' ? `“${i.content}”` : i.content}</p>
            <p className="num mt-1 text-sm text-mute">{[i.source, i.page && `p. ${i.page}`, subjects.find((s) => s.id === i.subjectId)?.name, books.find((b) => b.id === i.bookId)?.title, i.tags.join(', ')].filter(Boolean).join(' · ')}</p>
            <div className="mt-1 flex gap-3 text-sm">
              <button className="text-copper-soft" onClick={() => void db.insights.update(i.id, { favorite: !i.favorite })}>{i.favorite ? 'Desfavoritar' : 'Favoritar'}</button>
              <button className="text-copper-soft" onClick={() => void toCard(i)}>Criar flashcard</button>
              <button className="text-mute hover:text-red-400" onClick={() => { if (confirm('Apagar este insight?')) void db.insights.delete(i.id) }}>Apagar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
