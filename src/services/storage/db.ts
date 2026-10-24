import Dexie, { type Table } from 'dexie'
import type { TimerState } from '../../features/focus/timerCore'
import type { CardState, Rating } from '../../features/memory-lab/srsCore'

export interface Subject { id: string; name: string; color: string; archived: boolean; createdAt: number; weeklyGoalMin?: number }
export interface StudySession extends TimerState {
  subjectId?: string
  taskId?: string
  mediaId?: string
  manual?: boolean
  kind: 'free' | 'pomodoro' | 'countdown'
  notes?: string
  origin: 'local' | 'synced'
}
export interface Subtask { id: string; title: string; done: boolean }
export interface Task {
  id: string; title: string; description?: string; subjectId?: string
  priority: 'low' | 'medium' | 'high'; dueAt?: number
  status: 'pending' | 'doing' | 'done' | 'archived'
  subtasks: Subtask[]; estimateMin?: number; tags: string[]; createdAt: number; completedAt?: number; list?: string
}
export interface Flashcard {
  id: string; front: string; back: string; subjectId?: string; bookId?: string; source?: string; insightId?: string
  tags: string[]; createdAt: number; state: CardState
}
export interface ReviewEvent { id: string; cardId: string; at: number; rating: Rating; intervalDays: number }
export type InsightKind = 'quote' | 'idea' | 'learning' | 'application' | 'question' | 'relation' | 'summary'
export interface Insight {
  id: string; kind: InsightKind; content: string; subjectId?: string; bookId?: string; page?: number; source?: string
  tags: string[]; favorite: boolean; reflection?: string; createdAt: number; aiGenerated: boolean
}
export interface Book {
  id: string; title: string; author?: string; publisher?: string; edition?: string; isbn?: string; category?: string; language?: string
  format: 'physical' | 'digital' | 'audio'; totalPages?: number; currentPage: number
  status: 'want' | 'reading' | 'paused' | 'done' | 'dropped'
  startedAt?: number; finishedAt?: number; rating?: number; comment?: string; tags: string[]; pageGoalDaily?: number; createdAt: number
  cover?: string; series?: string; shelf?: string; shelfOrder?: number
}
export interface ReadingSession extends TimerState { bookId: string; startPage?: number; endPage?: number; notes?: string; origin: 'local' | 'synced' }
export interface MediaBookmark {
  id: string; url: string; provider: 'youtube' | 'spotify' | 'other'; embedUrl?: string; title: string
  subjectId?: string; notes?: string; done: boolean; tags: string[]; createdAt: number
}
export interface Setting { key: string; value: unknown }

export class StudyDB extends Dexie {
  subjects!: Table<Subject, string>
  sessions!: Table<StudySession, string>
  tasks!: Table<Task, string>
  flashcards!: Table<Flashcard, string>
  reviewEvents!: Table<ReviewEvent, string>
  insights!: Table<Insight, string>
  books!: Table<Book, string>
  readingSessions!: Table<ReadingSession, string>
  media!: Table<MediaBookmark, string>
  settings!: Table<Setting, string>
  constructor(name = 'studyos') {
    super(name)
    this.version(1).stores({
      subjects: 'id, archived',
      sessions: 'id, startedAt, endedAt, subjectId',
      settings: 'key',
    })
    this.version(2).stores({
      subjects: 'id, archived',
      sessions: 'id, startedAt, endedAt, subjectId, taskId',
      tasks: 'id, status, subjectId, dueAt',
      settings: 'key',
    })
    this.version(3).stores({
      subjects: 'id, archived',
      sessions: 'id, startedAt, endedAt, subjectId, taskId',
      tasks: 'id, status, subjectId, dueAt',
      flashcards: 'id, subjectId, insightId, createdAt',
      reviewEvents: 'id, cardId, at',
      insights: 'id, kind, subjectId, favorite, createdAt',
      settings: 'key',
    })
    this.version(4).stores({
      subjects: 'id, archived',
      sessions: 'id, startedAt, endedAt, subjectId, taskId',
      tasks: 'id, status, subjectId, dueAt',
      flashcards: 'id, subjectId, insightId, createdAt',
      reviewEvents: 'id, cardId, at',
      insights: 'id, kind, subjectId, bookId, favorite, createdAt',
      books: 'id, status, createdAt',
      readingSessions: 'id, bookId, startedAt',
      settings: 'key',
    })
    this.version(5).stores({
      subjects: 'id, archived',
      sessions: 'id, startedAt, endedAt, subjectId, taskId, mediaId',
      tasks: 'id, status, subjectId, dueAt',
      flashcards: 'id, subjectId, insightId, createdAt',
      reviewEvents: 'id, cardId, at',
      insights: 'id, kind, subjectId, bookId, favorite, createdAt',
      books: 'id, status, createdAt',
      readingSessions: 'id, bookId, startedAt',
      media: 'id, provider, createdAt',
      settings: 'key',
    })
  }
}
export const db = new StudyDB()

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value })
