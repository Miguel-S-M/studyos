export type GroupBy = 'shelf' | 'author' | 'series' | 'status'
export interface ShelfBook { id: string; title: string; author?: string; series?: string; shelf?: string; shelfOrder?: number; status: string; createdAt: number }
export interface Group<T> { key: string; label: string; books: T[] }

const STATUS_ORDER = ['reading', 'want', 'paused', 'done', 'dropped']
const STATUS_LABEL: Record<string, string> = { reading: 'Lendo', want: 'Quero ler', paused: 'Pausados', done: 'Concluídos', dropped: 'Abandonados' }
const byOrder = <T extends ShelfBook>(a: T, b: T) => (a.shelfOrder ?? Infinity) - (b.shelfOrder ?? Infinity) || a.createdAt - b.createdAt || a.title.localeCompare(b.title)
const norm = (s?: string) => (s ?? '').trim()

/** Agrupa os livros em estantes. Em autor e obra a estante é calculada (sem diferenciar maiúsculas). */
export function groupBooks<T extends ShelfBook>(books: T[], by: GroupBy, shelves: string[]): Group<T>[] {
  if (by === 'status') return STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s], books: books.filter((b) => b.status === s).sort(byOrder) })).filter((g) => g.books.length > 0)
  const field = (b: T) => norm(by === 'shelf' ? b.shelf : by === 'author' ? b.author : b.series)
  const map = new Map<string, Group<T>>()
  const add = (label: string) => { const k = label.toLocaleLowerCase('pt-BR'); if (!map.has(k)) map.set(k, { key: label, label, books: [] }); return map.get(k)! }
  if (by === 'shelf') shelves.forEach((s) => add(norm(s)))
  for (const b of books) { const f = field(b); if (f) add(f).books.push(b) }
  const named = [...map.values()]
  if (by !== 'shelf') named.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  const none = books.filter((b) => !field(b))
  const noneLabel = by === 'shelf' ? 'Sem estante' : by === 'author' ? 'Sem autor' : 'Sem obra'
  const out = [...named, ...(none.length > 0 || by === 'shelf' ? [{ key: '', label: noneLabel, books: none }] : [])]
  out.forEach((g) => g.books.sort(byOrder))
  return out
}

/** Nova ordem dos ids depois de soltar `movedId` antes de `beforeId` (ou no fim). */
export function moveBefore(ids: string[], movedId: string, beforeId?: string): string[] {
  if (movedId === beforeId) return ids
  const rest = ids.filter((i) => i !== movedId)
  const at = beforeId ? rest.indexOf(beforeId) : -1
  if (at < 0) return [...rest, movedId]
  return [...rest.slice(0, at), movedId, ...rest.slice(at)]
}
