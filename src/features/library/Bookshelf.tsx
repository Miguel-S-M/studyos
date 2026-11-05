import { useState } from 'react'
import { db, setSetting, type Book } from '../../services/storage/db'
import { fileToCover } from './coverUtil'
import { progressPct } from './readingCore'
import { startReading } from './readingService'
import { groupBooks, moveBefore, type GroupBy } from './shelfCore'

const spine = (t: string) => { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 35% 26%)` }
const mini = 'rounded border border-graphite-600 px-1.5 py-0.5 hover:bg-graphite-700 disabled:opacity-40'

export function Bookshelf({ books, shelves, groupBy, readingActive }: { books: Book[]; shelves: string[]; groupBy: GroupBy; readingActive: boolean }) {
  const [flipped, setFlipped] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [newShelf, setNewShelf] = useState('')
  const groups = groupBooks(books, groupBy, shelves)

  const writeOrder = (ids: string[]) => Promise.all(ids.map((id, i) => db.books.update(id, { shelfOrder: i })))
  async function drop(groupKey: string, beforeId?: string) {
    const id = dragId; setDragId(null)
    const target = groups.find((g) => g.key === groupKey)
    if (!id || !target) return
    const same = target.books.some((b) => b.id === id)
    if (!same && groupBy !== 'shelf') return setMsg('Neste modo as estantes são automáticas: só dá para reordenar dentro do mesmo grupo. Use "Minhas estantes" para mover entre estantes.')
    setMsg('')
    const ids = moveBefore(target.books.map((b) => b.id), id, beforeId)
    await db.transaction('rw', db.books, async () => {
      if (!same) await db.books.update(id, { shelf: groupKey || undefined })
      await writeOrder(ids)
    })
  }
  async function nudge(ids: string[], id: string, dir: -1 | 1) {
    const i = ids.indexOf(id), j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await writeOrder(ids)
  }
  async function addShelf(e: React.FormEvent) {
    e.preventDefault()
    const n = newShelf.trim().slice(0, 40)
    if (!n || shelves.some((s) => s.toLocaleLowerCase() === n.toLocaleLowerCase())) return
    await setSetting('shelves', [...shelves, n]); setNewShelf('')
  }
  async function removeShelf(name: string) {
    if (!confirm(`Remover a estante "${name}"? Os livros não serão apagados; voltam para "Sem estante".`)) return
    await db.transaction('rw', db.books, db.settings, async () => {
      await db.books.where('id').anyOf(books.filter((b) => b.shelf === name).map((b) => b.id)).modify({ shelf: undefined })
      await setSetting('shelves', shelves.filter((s) => s !== name))
    })
  }
  async function setCover(b: Book, f?: File) {
    if (!f) return
    try { await db.books.update(b.id, { cover: await fileToCover(f) }); setMsg('') } catch (e) { setMsg((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {groupBy === 'shelf' && (
        <form onSubmit={addShelf} className="flex gap-2"><input aria-label="Nome da nova estante" className="flex-1 rounded bg-graphite-800 p-2" placeholder="Nova estante (ex.: Favoritos)" value={newShelf} onChange={(e) => setNewShelf(e.target.value)} maxLength={40} /><button className="rounded-md border border-graphite-600 px-3 py-2">Criar estante</button></form>
      )}
      <p className="text-sm text-mute">Clique num livro para virá-lo. Arraste para reordenar{groupBy === 'shelf' ? ' ou mover entre estantes' : ''}; no celular, use as setas e o seletor no verso do livro.</p>
      {msg && <p role="alert" className="text-red-400">{msg}</p>}
      {groups.map((g) => (
        <section key={g.key || '__none'} aria-label={`Estante: ${g.label}`} className="rounded-lg border-b-[10px] border-copper/50 bg-graphite-900 p-3"
          onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => void drop(g.key)}>
          <h3 className="mb-2 flex items-center justify-between font-semibold">
            <span>{g.label} <span className="num text-sm font-normal text-mute">({g.books.length})</span></span>
            {groupBy === 'shelf' && g.key && <button className="text-sm font-normal text-mute hover:text-red-400" onClick={() => void removeShelf(g.key)}>Remover estante</button>}
          </h3>
          <div className="flex flex-wrap gap-4">
            {g.books.length === 0 && <p className="text-sm text-mute">Estante vazia. Arraste um livro para cá.</p>}
            {g.books.map((b) => {
              const open = flipped === b.id
              const pct = progressPct(b.currentPage, b.totalPages)
              const ids = g.books.map((x) => x.id)
              return (
                <div key={b.id} className={`h-52 w-36 ${dragId === b.id ? 'opacity-40' : ''}`} style={{ perspective: 900 }} draggable={!open}
                  onDragStart={() => setDragId(b.id)} onDragEnd={() => setDragId(null)} onDragOver={(e) => dragId && e.preventDefault()} onDrop={(e) => { e.stopPropagation(); void drop(g.key, b.id) }}>
                  <div className="relative h-full w-full transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: open ? 'rotateY(180deg)' : 'none' }}>
                    <button type="button" tabIndex={open ? -1 : 0} aria-label={`Virar o livro ${b.title}`} onClick={() => setFlipped(b.id)}
                      className="absolute inset-0 overflow-hidden rounded-md border border-graphite-600 text-left shadow-lg" style={{ backfaceVisibility: 'hidden', background: b.cover ? '#000' : spine(b.title) }}>
                      {b.cover ? <img src={b.cover} alt={`Capa de ${b.title}`} className="h-full w-full object-cover" draggable={false} />
                        : <span className="flex h-full flex-col justify-between p-3"><span className="font-semibold leading-tight">{b.title}</span><span className="text-xs text-bone/80">{b.author}</span></span>}
                    </button>
                    <div className="absolute inset-0 overflow-y-auto rounded-md border border-copper bg-graphite-800 p-2 text-xs" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      {open && (
                        <div className="space-y-1.5">
                          <p className="font-semibold">{b.title}</p>
                          <input aria-label="Autor" className="w-full rounded bg-graphite-700 p-1" placeholder="Autor" defaultValue={b.author} onBlur={(e) => void db.books.update(b.id, { author: e.target.value.trim() || undefined })} />
                          <input aria-label="Obra ou coleção" className="w-full rounded bg-graphite-700 p-1" placeholder="Obra / coleção" defaultValue={b.series} onBlur={(e) => void db.books.update(b.id, { series: e.target.value.trim() || undefined })} />
                          <select aria-label="Estante" className="w-full rounded bg-graphite-700 p-1" value={b.shelf ?? ''} onChange={(e) => void db.books.update(b.id, { shelf: e.target.value || undefined })}>
                            <option value="">Sem estante</option>{shelves.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <p className="num text-mute">{b.currentPage}{b.totalPages ? ` de ${b.totalPages}` : ''} págs.{pct !== undefined && ` (${pct}%)`}</p>
                          <div className="flex flex-wrap gap-1">
                            <button className={mini} aria-label="Mover para a esquerda" onClick={() => void nudge(ids, b.id, -1)}>◀</button>
                            <button className={mini} aria-label="Mover para a direita" onClick={() => void nudge(ids, b.id, 1)}>▶</button>
                            <button className={mini} disabled={readingActive} onClick={() => void startReading(b.id, b.currentPage)}>Ler</button>
                            <label className={`${mini} cursor-pointer`}>Capa<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { void setCover(b, e.target.files?.[0]); e.target.value = '' }} /></label>
                            {b.cover && <button className={mini} onClick={() => void db.books.update(b.id, { cover: undefined })}>Sem capa</button>}
                            <button className={mini} onClick={() => setFlipped(null)}>Voltar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
