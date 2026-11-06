// Validação do backup JSON sem bibliotecas. Tipos: s=texto, n=número, b=booleano, sa=lista de textos, [a,b]=valores permitidos.
const str = (v) => typeof v === 'string'
const num = (v) => typeof v === 'number' && Number.isFinite(v)
const PAUSES = (v) => Array.isArray(v) && v.every((p) => p && num(p.start) && (p.end === undefined || num(p.end)))
const T = {
  s: str, n: num, b: (v) => typeof v === 'boolean', sa: (v) => Array.isArray(v) && v.every(str), pauses: PAUSES,
  subtasks: (v) => Array.isArray(v) && v.every((s) => s && str(s.id) && str(s.title) && typeof s.done === 'boolean'),
  card: (v) => v && ['ease', 'intervalDays', 'reps', 'lapses', 'dueAt'].every((k) => num(v[k])),
  cover: (v) => str(v) && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
  any: () => true,
}
const SPEC = {
  subjects: { id: 's', name: 's', color: 's', archived: 'b', createdAt: 'n', 'weeklyGoalMin?': 'n' },
  tasks: { id: 's', title: 's', 'description?': 's', 'subjectId?': 's', priority: ['low', 'medium', 'high'], 'dueAt?': 'n', status: ['pending', 'doing', 'done', 'archived'], subtasks: 'subtasks', 'estimateMin?': 'n', tags: 'sa', createdAt: 'n', 'completedAt?': 'n', 'list?': 's' },
  sessions: { id: 's', startedAt: 'n', 'endedAt?': 'n', pauses: 'pauses', 'subjectId?': 's', 'taskId?': 's', 'mediaId?': 's', 'manual?': 'b', kind: ['free', 'pomodoro', 'countdown'], 'notes?': 's', origin: ['local', 'synced'] },
  flashcards: { id: 's', front: 's', back: 's', 'subjectId?': 's', 'bookId?': 's', 'source?': 's', 'insightId?': 's', tags: 'sa', createdAt: 'n', state: 'card' },
  reviewEvents: { id: 's', cardId: 's', at: 'n', rating: ['hard', 'partial', 'easy'], intervalDays: 'n' },
  insights: { id: 's', 'bookId?': 's', kind: ['quote', 'idea', 'learning', 'application', 'question', 'relation', 'summary'], content: 's', 'subjectId?': 's', 'page?': 'n', 'source?': 's', tags: 'sa', favorite: 'b', 'reflection?': 's', createdAt: 'n', aiGenerated: 'b' },
  books: { id: 's', title: 's', 'author?': 's', 'publisher?': 's', 'edition?': 's', 'isbn?': 's', 'category?': 's', 'language?': 's', format: ['physical', 'digital', 'audio'], 'totalPages?': 'n', currentPage: 'n', status: ['want', 'reading', 'paused', 'done', 'dropped'], 'startedAt?': 'n', 'finishedAt?': 'n', 'rating?': 'n', 'comment?': 's', tags: 'sa', 'pageGoalDaily?': 'n', createdAt: 'n', 'cover?': 'cover', 'series?': 's', 'shelf?': 's', 'shelfOrder?': 'n' },
  readingSessions: { id: 's', bookId: 's', startedAt: 'n', 'endedAt?': 'n', pauses: 'pauses', 'startPage?': 'n', 'endPage?': 'n', 'notes?': 's', origin: ['local', 'synced'] },
  media: { id: 's', url: 's', provider: ['youtube', 'spotify', 'other'], 'embedUrl?': 's', title: 's', 'subjectId?': 's', 'notes?': 's', done: 'b', tags: 'sa', createdAt: 'n' },
  settings: { key: 's', 'value?': 'any' },
}
export const BACKUP_STORES = Object.keys(SPEC)
const ok = (v, t) => (Array.isArray(t) ? t.includes(v) : T[t](v))

/** Devolve null se válido, ou uma mensagem em português dizendo onde está o problema. */
export function validateBackup(b) {
  if (!b || typeof b !== 'object' || b.app !== 'studyos' || b.version !== 1) return 'Este arquivo não é um backup do StudyOS.'
  for (const [store, spec] of Object.entries(SPEC)) {
    const rows = b[store] === undefined ? [] : b[store]
    if (!Array.isArray(rows)) return `"${store}" deveria ser uma lista.`
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r || typeof r !== 'object') return `${store}[${i}] não é um registro válido.`
      for (const [k, t] of Object.entries(spec)) {
        const opt = k.endsWith('?'), key = opt ? k.slice(0, -1) : k
        if (r[key] === undefined) { if (opt) continue; return `${store}[${i}].${key} está faltando.` }
        if (!ok(r[key], t)) return `${store}[${i}].${key} tem um valor inválido.`
      }
    }
  }
  return null
}
