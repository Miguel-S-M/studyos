import { useEffect, useState } from 'react'
import { db, getSetting, type Book } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { formatClock, isAbandoned } from '../focus/activeCore'
import { focusedMs, isPaused } from '../focus/timerCore'
import { endOfLocalDay, formatDuration, startOfLocalDay } from '../dashboard/statsCore'
import { cancelReading, finishReading, getActiveReading, heartbeatReading, pauseReading, resumeReading, startReading } from './readingService'
import { pagesRead, progressPct, readingSummary } from './readingCore'
import { Bookshelf } from './Bookshelf'
import { fileToCover } from './coverUtil'
import type { GroupBy } from './shelfCore'

const field = 'rounded bg-graphite-800 p-2'
const primary = 'rounded-md bg-ember px-4 py-2 font-medium text-ink'
const ghost = 'rounded-md border border-graphite-600 px-4 py-2 hover:bg-graphite-700'
const STATUS: Record<Book['status'], string> = { want: 'Quero ler', reading: 'Lendo', paused: 'Pausado', done: 'Concluído', dropped: 'Abandonado' }
const FORMAT: Record<Book['format'], string> = { physical: 'Físico', digital: 'Digital', audio: 'Audiolivro' }

export function Library() {
  const data = useLive(async () => ({ books: await db.books.toArray(), rs: await db.readingSessions.toArray(), active: await getActiveReading(), shelves: await getSetting<string[]>('shelves', []) }))
  const [now, setNow] = useState(Date.now())
  const [title, setTitle] = useState(''); const [author, setAuthor] = useState(''); const [format, setFormat] = useState<Book['format']>('physical')
  const [total, setTotal] = useState(''); const [status, setStatus] = useState<Book['status']>('want')
  const [series, setSeries] = useState(''); const [coverFile, setCoverFile] = useState<File | null>(null); const [coverErr, setCoverErr] = useState('')
  const [view, setView] = useState<'list' | 'shelf'>('shelf'); const [groupBy, setGroupBy] = useState<GroupBy>('shelf')
  const [endPage, setEndPage] = useState(''); const [notes, setNotes] = useState('')
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t) }, [])
  useEffect(() => { const t = setInterval(() => void heartbeatReading(), 30_000); return () => clearInterval(t) }, [])

  if (data.error) return <p role="alert">Erro ao ler a biblioteca: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>
  const { books, rs, active, shelves } = data.data
  const activeBook = books.find((b) => b.id === active?.bookId)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    let cover: string | undefined
    if (coverFile) { try { cover = await fileToCover(coverFile) } catch (err) { return setCoverErr((err as Error).message) } }
    setCoverErr('')
    await db.books.add({ id: crypto.randomUUID(), cover, series: series.trim() || undefined, title: title.trim(), author: author.trim() || undefined, format, totalPages: total ? Math.max(1, Number(total)) : undefined, currentPage: 0, status, tags: [], createdAt: Date.now() })
    setTitle(''); setAuthor(''); setTotal(''); setSeries(''); setCoverFile(null)
  }
  const week = readingSummary(rs, startOfLocalDay(now) - 6 * 86_400_000, startOfLocalDay(now) + 86_400_000, now)

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Biblioteca</h1>
      {active && (
        <section className="rounded-lg border border-copper bg-graphite-900 p-4" aria-label="Leitura em andamento">
          {isAbandoned(active, now) && (
            <div role="alert" className="mb-3 rounded-lg border border-ember p-3">
              <p>Esta leitura ficou sem nenhuma aba aberta desde {new Date(active.lastSeenAt).toLocaleTimeString()}. O que fazer?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className={primary} onClick={() => void finishReading(endPage === '' ? undefined : Number(endPage), notes, active.lastSeenAt)}>Finalizar no último momento visto</button>
                <button className={ghost} onClick={() => void heartbeatReading()}>Continuar leitura</button>
                <button className={ghost} onClick={() => { if (confirm('Descartar esta leitura sem salvar?')) void cancelReading() }}>Descartar</button>
              </div>
            </div>
          )}
          <p className="text-sm text-mute">Lendo agora</p>
          <p className="font-semibold">{activeBook?.title ?? 'Livro removido'}</p>
          <p className="num text-5xl font-semibold text-ember" role="timer">{formatClock(focusedMs(active.state, now))}</p>
          <p className="text-sm text-mute">{isPaused(active.state) ? 'Pausado — a pausa não conta como leitura.' : `Desde a página ${active.startPage ?? '?'}`}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input aria-label="Página final" type="number" min={0} className={`${field} num`} placeholder="Página em que parou" value={endPage} onChange={(e) => setEndPage(e.target.value)} />
            <input aria-label="Nota da sessão" className={field} placeholder="Nota da sessão (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {isPaused(active.state) ? <button className={primary} onClick={() => void resumeReading()}>Retomar</button> : <button className={ghost} onClick={() => void pauseReading()}>Pausar</button>}
            <button className={primary} onClick={async () => { await finishReading(endPage === '' ? undefined : Number(endPage), notes); setEndPage(''); setNotes('') }}>Finalizar e salvar</button>
            <button className={ghost} onClick={() => { if (confirm('Cancelar sem salvar esta leitura?')) void cancelReading() }}>Cancelar</button>
          </div>
        </section>
      )}
      <p className="num text-mute">Leitura nos últimos 7 dias: {formatDuration(week.ms)} e {week.pages} páginas registradas (separado do tempo de estudo)</p>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Título" className={`${field} sm:col-span-2`} placeholder="Título do livro" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <input aria-label="Autor" className={field} placeholder="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <input aria-label="Total de páginas" type="number" min={1} className={`${field} num`} placeholder="Total de páginas" value={total} onChange={(e) => setTotal(e.target.value)} />
        <input aria-label="Obra ou coleção" className={field} placeholder="Obra / coleção (opcional)" value={series} onChange={(e) => setSeries(e.target.value)} />
        <label className="block text-sm text-mute">Capa (opcional)<input aria-label="Capa" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} /></label>
        {coverErr && <p role="alert" className="text-red-400 sm:col-span-2">{coverErr}</p>}
        <select aria-label="Formato" className={field} value={format} onChange={(e) => setFormat(e.target.value as Book['format'])}>{Object.entries(FORMAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select aria-label="Estado" className={field} value={status} onChange={(e) => setStatus(e.target.value as Book['status'])}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className={`${primary} sm:col-span-2`}>Adicionar livro</button>
      </form>
      {books.length === 0 && <p className="text-mute">Nenhum livro ainda. Adicione o primeiro acima; não é preciso consulta online.</p>}
      {books.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Modo de exibição" className="flex overflow-hidden rounded-md border border-graphite-600">
            <button aria-pressed={view === 'shelf'} className={`px-3 py-1 ${view === 'shelf' ? 'bg-graphite-700 text-ember' : ''}`} onClick={() => setView('shelf')}>Estante</button>
            <button aria-pressed={view === 'list'} className={`px-3 py-1 ${view === 'list' ? 'bg-graphite-700 text-ember' : ''}`} onClick={() => setView('list')}>Lista</button>
          </div>
          {view === 'shelf' && (
            <select aria-label="Organizar por" className={field} value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
              <option value="shelf">Minhas estantes</option><option value="author">Por autor</option><option value="series">Por obra / coleção</option><option value="status">Por estado de leitura</option>
            </select>
          )}
        </div>
      )}
      {view === 'shelf' && books.length > 0 ? <Bookshelf books={books} shelves={shelves} groupBy={groupBy} readingActive={!!active} /> : (
      <ul className="space-y-2">
        {[...books].sort((a, b) => b.createdAt - a.createdAt).map((b) => {
          const pct = progressPct(b.currentPage, b.totalPages)
          const sess = rs.filter((s) => s.bookId === b.id)
          const pages = sess.reduce((t, s) => t + (pagesRead(s) ?? 0), 0)
          return (
            <li key={b.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-3">
              {b.cover && <img src={b.cover} alt={`Capa de ${b.title}`} className="float-right ml-2 h-16 rounded" />}
              <p className="font-medium">{b.title}{b.author && <span className="text-mute"> — {b.author}</span>}</p>
              <p className="num text-sm text-mute">{FORMAT[b.format]} · {sess.length} sessões · {formatDuration(sess.reduce((t, s) => t + focusedMs(s, now), 0))} · {pages} páginas registradas</p>
              {pct !== undefined && <div className="mt-1 h-2 overflow-hidden rounded bg-graphite-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${b.title}`}><div className="h-full bg-gradient-to-r from-copper to-ember" style={{ width: `${pct}%` }} /></div>}
              {b.pageGoalDaily ? <p className="num text-sm text-mute">Hoje: {readingSummary(sess, startOfLocalDay(now), endOfLocalDay(now), now).pages} de {b.pageGoalDaily} páginas</p> : null}
              {b.comment && <p className="mt-1 text-sm italic">“{b.comment}”</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-1">Nota
                  <select aria-label={`Nota de ${b.title}`} className={field} value={b.rating ?? ''} onChange={(e) => void db.books.update(b.id, { rating: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">Sem nota</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1">Meta págs/dia
                  <input type="number" min={0} max={2000} aria-label={`Meta de páginas por dia de ${b.title}`} className={`${field} num w-20`} defaultValue={b.pageGoalDaily ?? ''} onBlur={(e) => void db.books.update(b.id, { pageGoalDaily: Math.min(2000, Math.max(0, Math.round(Number(e.target.value) || 0))) || undefined })} />
                </label>
                <input aria-label={`Comentário sobre ${b.title}`} className={`${field} min-w-40 flex-1`} placeholder="Comentário" maxLength={500} defaultValue={b.comment} onBlur={(e) => void db.books.update(b.id, { comment: e.target.value.trim() || undefined })} />
                <select aria-label="Estado" className={field} value={b.status} onChange={(e) => void db.books.update(b.id, { status: e.target.value as Book['status'], ...(e.target.value === 'done' ? { finishedAt: Date.now() } : {}) })}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <label className="flex items-center gap-1">Página
                  <input type="number" min={0} className={`${field} num w-20`} key={b.currentPage} defaultValue={b.currentPage} onBlur={(e) => void db.books.update(b.id, { currentPage: Math.max(0, Number(e.target.value) || 0) })} />
                  {b.totalPages && <span className="num text-mute">de {b.totalPages}</span>}
                </label>
                <button className={ghost} disabled={!!active} onClick={() => void startReading(b.id, b.currentPage)}>Ler agora</button>
                <button className="text-mute hover:text-red-400" onClick={() => { if (confirm('Apagar o livro e suas sessões de leitura?')) void db.transaction('rw', db.books, db.readingSessions, async () => { await db.books.delete(b.id); await db.readingSessions.where('bookId').equals(b.id).delete() }) }}>Apagar</button>
              </div>
            </li>
          )
        })}
      </ul>)}
    </div>
  )
}
