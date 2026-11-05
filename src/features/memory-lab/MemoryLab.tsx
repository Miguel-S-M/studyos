import { useState } from 'react'
import { db, type Flashcard } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { cardStats, isDueToday, newCardState, review, reviewSummary, type Rating } from './srsCore'
import { exportBackup } from '../../services/storage/backup'
import { downloadText } from '../../services/storage/download'

const field = 'rounded bg-graphite-800 p-2'
const primary = 'rounded-md bg-ember px-4 py-2 font-medium text-ink'
const ghost = 'rounded-md border border-graphite-600 px-4 py-2 hover:bg-graphite-700'

export function MemoryLab() {
  const data = useLive(async () => ({ cards: await db.flashcards.toArray(), subjects: await db.subjects.toArray(), books: await db.books.toArray(), events: await db.reviewEvents.toArray() }))
  const [reviewing, setReviewing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [front, setFront] = useState(''); const [back, setBack] = useState(''); const [subjectId, setSubjectId] = useState(''); const [bookId, setBookId] = useState(''); const [source, setSource] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ front: '', back: '' })

  if (data.error) return <p role="alert">Erro ao ler os cartões: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>
  const now = Date.now()
  const { cards, subjects, books, events } = data.data
  const stats = cardStats(cards, now)
  const queue = cards.filter((c) => isDueToday(c.state, now)).sort((a, b) => a.state.dueAt - b.state.dueAt)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    await db.flashcards.add({ id: crypto.randomUUID(), front: front.trim(), back: back.trim(), subjectId: subjectId || undefined, bookId: bookId || undefined, source: source.trim() || undefined, tags: [], createdAt: now, state: newCardState(now) })
    setFront(''); setBack(''); setSource('')
  }
  async function rate(c: Flashcard, rating: Rating) {
    const next = review(c.state, rating, Date.now())
    await db.transaction('rw', db.flashcards, db.reviewEvents, async () => {
      await db.flashcards.update(c.id, { state: next })
      await db.reviewEvents.add({ id: crypto.randomUUID(), cardId: c.id, at: Date.now(), rating, intervalDays: next.intervalDays })
    })
    setRevealed(false)
  }

  if (reviewing) {
    const c = queue[0]
    return (
      <div className="max-w-xl space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Revisão</h1><button className={ghost} onClick={() => { setReviewing(false); setRevealed(false) }}>Sair</button></div>
        {!c ? <p className="text-copper-soft" role="status">Fila de hoje concluída. Você pode voltar amanhã para os próximos cartões.</p> : (
          <>
            <p className="num text-sm text-mute">{queue.length} na fila</p>
            <div className="rounded-lg border border-graphite-600 bg-graphite-900 p-6">
              <p className="whitespace-pre-wrap text-xl">{c.front}</p>
              {revealed && <p className="mt-4 whitespace-pre-wrap border-t border-graphite-600 pt-4 text-ember">{c.back}</p>}
              {revealed && c.source && <p className="mt-2 text-sm text-mute">Fonte: {c.source}</p>}
            </div>
            {!revealed ? <button className={primary} onClick={() => setRevealed(true)}>Mostrar resposta</button> : (
              <div className="flex flex-wrap gap-2">
                <button className={ghost} onClick={() => void rate(c, 'hard')}>Difícil</button>
                <button className={ghost} onClick={() => void rate(c, 'partial')}>Parcial</button>
                <button className={primary} onClick={() => void rate(c, 'easy')}>Fácil</button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const shown = cards.filter((c) => !q || `${c.front} ${c.back}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt)
  const stat = (label: string, v: number) => <div className="rounded-lg border border-graphite-600 bg-graphite-900 p-3"><p className="text-sm text-mute">{label}</p><p className="num text-2xl font-semibold">{v}</p></div>
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Laboratório de memória</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stat('Para hoje', stats.dueToday)}{stat('Atrasados', stats.overdue)}{stat('Difíceis', stats.difficult)}{stat('Intervalo ≥ 21 dias', stats.mature)}{stat('Total', stats.total)}
      </div>
      {(() => { const r = reviewSummary(events, now - 30 * 86_400_000); return (
        <p className="num text-sm text-mute">{r.total === 0 ? 'Nenhuma revisão nos últimos 30 dias.' : `Últimos 30 dias: ${r.total} revisões; você marcou parcial ou fácil em ${r.pct}% e difícil em ${r.hard}.`}</p>
      ) })()}
      <button className={primary} disabled={queue.length === 0} onClick={() => setReviewing(true)}>{queue.length ? `Revisar ${queue.length} cartões` : 'Nada para revisar hoje'}</button>
      <form onSubmit={add} className="grid gap-2">
        <textarea aria-label="Frente (pergunta)" className={field} placeholder="Frente: pergunta" value={front} onChange={(e) => setFront(e.target.value)} />
        <textarea aria-label="Verso (resposta)" className={field} placeholder="Verso: resposta" value={back} onChange={(e) => setBack(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <select aria-label="Matéria" className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Sem matéria</option>{subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select aria-label="Livro" className={field} value={bookId} onChange={(e) => setBookId(e.target.value)}><option value="">Sem livro</option>{books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
          <input aria-label="Fonte" className={`${field} flex-1`} placeholder="Fonte ou página (opcional)" value={source} onChange={(e) => setSource(e.target.value)} />
          <button className={primary}>Adicionar cartão</button>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <button className={ghost} disabled={cards.length === 0} onClick={async () => {
          const b = await exportBackup()
          downloadText(`studyos-cartoes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...b, subjects: [], tasks: [], sessions: [], insights: [], books: [], readingSessions: [], media: [], settings: [] }, null, 2), 'application/json')
        }}>Exportar só os cartões</button>
        <span className="text-sm text-mute">Para importar, use "Importar JSON" em Configurações.</span>
      </div>
      <input aria-label="Pesquisar cartões" type="search" className={`${field} w-full`} placeholder="Pesquisar cartões" value={q} onChange={(e) => setQ(e.target.value)} />
      {cards.length === 0 && <p className="text-mute">Nenhum cartão ainda. Crie o primeiro acima ou a partir de um insight.</p>}
      <ul className="space-y-2">
        {shown.map((c) => (
          <li key={c.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-3">
            {editing === c.id ? (
              <div className="grid gap-2">
                <textarea aria-label="Frente" className={field} value={draft.front} onChange={(e) => setDraft({ ...draft, front: e.target.value })} />
                <textarea aria-label="Verso" className={field} value={draft.back} onChange={(e) => setDraft({ ...draft, back: e.target.value })} />
                <div className="flex gap-3"><button className="text-copper-soft" onClick={async () => { if (draft.front.trim() && draft.back.trim()) await db.flashcards.update(c.id, { front: draft.front.trim(), back: draft.back.trim() }); setEditing(null) }}>Salvar</button><button className="text-mute" onClick={() => setEditing(null)}>Cancelar</button></div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{c.front}</p>
                {c.bookId && <p className="text-xs text-copper-soft">Livro: {books.find((b) => b.id === c.bookId)?.title ?? 'removido'}</p>}
                <p className="num mt-1 text-sm text-mute">{c.state.reps === 0 && c.state.lapses === 0 ? 'Novo' : `intervalo ${c.state.intervalDays} d · próxima ${new Date(c.state.dueAt).toLocaleDateString()}`}</p>
                <div className="mt-1 flex gap-3 text-sm"><button className="text-copper-soft" onClick={() => { setEditing(c.id); setDraft({ front: c.front, back: c.back }) }}>Editar</button>
                  <button className="text-mute hover:text-red-400" onClick={async () => { if (confirm('Apagar este cartão e seu histórico de revisões?')) await db.transaction('rw', db.flashcards, db.reviewEvents, async () => { await db.flashcards.delete(c.id); await db.reviewEvents.where('cardId').equals(c.id).delete() }) }}>Apagar</button></div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
