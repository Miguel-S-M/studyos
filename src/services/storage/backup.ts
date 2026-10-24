import { z } from 'zod'
import { db, type Setting } from './db'

const pause = z.object({ start: z.number(), end: z.number().optional() })
const id = z.string().min(1)
export const backupSchema = z.object({
  app: z.literal('studyos'),
  version: z.literal(1),
  exportedAt: z.number(),
  subjects: z.array(z.object({ id, name: z.string(), color: z.string(), archived: z.boolean(), createdAt: z.number(), weeklyGoalMin: z.number().optional() })),
  tasks: z.array(z.object({
    id, title: z.string(), description: z.string().optional(), subjectId: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']), dueAt: z.number().optional(),
    status: z.enum(['pending', 'doing', 'done', 'archived']),
    subtasks: z.array(z.object({ id, title: z.string(), done: z.boolean() })),
    estimateMin: z.number().optional(), tags: z.array(z.string()), createdAt: z.number(), completedAt: z.number().optional(), list: z.string().optional(),
  })),
  sessions: z.array(z.object({
    id, startedAt: z.number(), endedAt: z.number().optional(), pauses: z.array(pause),
    subjectId: z.string().optional(), taskId: z.string().optional(), mediaId: z.string().optional(), manual: z.boolean().optional(),
    kind: z.enum(['free', 'pomodoro', 'countdown']), notes: z.string().optional(), origin: z.enum(['local', 'synced']),
  })),
  flashcards: z.array(z.object({
    id, front: z.string(), back: z.string(), subjectId: z.string().optional(), bookId: z.string().optional(), source: z.string().optional(), insightId: z.string().optional(),
    tags: z.array(z.string()), createdAt: z.number(),
    state: z.object({ ease: z.number(), intervalDays: z.number(), reps: z.number(), lapses: z.number(), dueAt: z.number() }),
  })).default([]),
  reviewEvents: z.array(z.object({ id, cardId: z.string(), at: z.number(), rating: z.enum(['hard', 'partial', 'easy']), intervalDays: z.number() })).default([]),
  insights: z.array(z.object({
    id, bookId: z.string().optional(), kind: z.enum(['quote', 'idea', 'learning', 'application', 'question', 'relation', 'summary']), content: z.string(),
    subjectId: z.string().optional(), page: z.number().optional(), source: z.string().optional(), tags: z.array(z.string()),
    favorite: z.boolean(), reflection: z.string().optional(), createdAt: z.number(), aiGenerated: z.boolean(),
  })).default([]),
  books: z.array(z.object({
    id, title: z.string(), author: z.string().optional(), publisher: z.string().optional(), edition: z.string().optional(), isbn: z.string().optional(),
    category: z.string().optional(), language: z.string().optional(), format: z.enum(['physical', 'digital', 'audio']),
    totalPages: z.number().optional(), currentPage: z.number(), status: z.enum(['want', 'reading', 'paused', 'done', 'dropped']),
    startedAt: z.number().optional(), finishedAt: z.number().optional(), rating: z.number().optional(), comment: z.string().optional(),
    tags: z.array(z.string()), pageGoalDaily: z.number().optional(), createdAt: z.number(),
    cover: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).optional(), series: z.string().optional(), shelf: z.string().optional(), shelfOrder: z.number().optional(),
  })).default([]),
  readingSessions: z.array(z.object({
    id, bookId: z.string(), startedAt: z.number(), endedAt: z.number().optional(), pauses: z.array(pause),
    startPage: z.number().optional(), endPage: z.number().optional(), notes: z.string().optional(), origin: z.enum(['local', 'synced']),
  })).default([]),
  media: z.array(z.object({
    id, url: z.string(), provider: z.enum(['youtube', 'spotify', 'other']), embedUrl: z.string().optional(), title: z.string(),
    subjectId: z.string().optional(), notes: z.string().optional(), done: z.boolean(), tags: z.array(z.string()), createdAt: z.number(),
  })).default([]),
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })),
})
export type Backup = z.infer<typeof backupSchema>
const SKIP = new Set(['activeSession']) // a sessão em andamento não faz parte do backup

export async function exportBackup(now = Date.now()): Promise<Backup> {
  const [subjects, tasks, sessions, flashcards, reviewEvents, insights, books, readingSessions, media, settings] = await Promise.all([
    db.subjects.toArray(), db.tasks.toArray(), db.sessions.toArray(), db.flashcards.toArray(), db.reviewEvents.toArray(), db.insights.toArray(), db.books.toArray(), db.readingSessions.toArray(), db.media.toArray(), db.settings.toArray()])
  return { app: 'studyos', version: 1, exportedAt: now, subjects, tasks, sessions, flashcards, reviewEvents, insights, books, readingSessions, media, settings: settings.filter((s) => !SKIP.has(s.key)) }
}

export function parseBackup(text: string): { ok: true; data: Backup } | { ok: false; error: string } {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { ok: false, error: 'O arquivo não é um JSON válido.' } }
  const r = backupSchema.safeParse(raw)
  if (r.success) return { ok: true, data: r.data }
  const i = r.error.issues[0]
  return { ok: false, error: `Arquivo inválido em "${i.path.join('.') || 'raiz'}": ${i.message}` }
}

/** Mescla por id (put): nunca apaga nada que já existe; o mesmo arquivo importado duas vezes não duplica. */
export async function importBackup(b: Backup) {
  await db.transaction('rw', [db.subjects, db.tasks, db.sessions, db.flashcards, db.reviewEvents, db.insights, db.books, db.readingSessions, db.media, db.settings], async () => {
    await db.subjects.bulkPut(b.subjects)
    await db.tasks.bulkPut(b.tasks)
    await db.sessions.bulkPut(b.sessions)
    await db.flashcards.bulkPut(b.flashcards)
    await db.reviewEvents.bulkPut(b.reviewEvents)
    await db.insights.bulkPut(b.insights)
    await db.books.bulkPut(b.books)
    await db.readingSessions.bulkPut(b.readingSessions)
    await db.media.bulkPut(b.media)
    await db.settings.bulkPut(b.settings.filter((s) => !SKIP.has(s.key)) as Setting[])
  })
  return { subjects: b.subjects.length, tasks: b.tasks.length, sessions: b.sessions.length, flashcards: b.flashcards.length, insights: b.insights.length, books: b.books.length, media: b.media.length }
}
