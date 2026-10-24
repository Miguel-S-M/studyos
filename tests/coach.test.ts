import { describe, expect, it } from 'vitest'
import { buildSuggestions } from '../src/features/holo/coachCore'

const H = 3_600_000
const now = new Date(2026, 9, 23, 15).getTime()
const sess = (daysAgo: number, h = 1) => { const s = new Date(2026, 9, 23 - daysAgo, 10).getTime(); return { id: String(daysAgo), startedAt: s, endedAt: s + h * H, pauses: [] } }
const base = { tasks: [], dueCards: 0, goalMin: 120, now }
const ids = (x: ReturnType<typeof buildSuggestions>) => x.map((s) => s.id)

describe('Holo local', () => {
  it('sem dados, orienta o começo', () => expect(ids(buildSuggestions({ ...base, sessions: [] }))).toEqual(['start', 'empty']))
  it('sem foco hoje mas com sequência, avisa da sequência', () => expect(ids(buildSuggestions({ ...base, sessions: [sess(1), sess(2)] }))).toEqual(['start', 'streak']))
  it('mostra progresso real e meta cumprida', () => {
    const p = buildSuggestions({ ...base, sessions: [sess(0, 1)] })[0]
    expect(p.text).toBe('Hoje: 60 de 120 min (50%). Faltam 60 min.')
    expect(buildSuggestions({ ...base, sessions: [sess(0, 2)] })[0].id).toBe('goal')
  })
  it('lista tarefas vencidas e cartões do dia', () => {
    const r = buildSuggestions({ ...base, sessions: [sess(0)], dueCards: 3, tasks: [{ title: 'Lista 3', status: 'pending', dueAt: now - H }, { title: 'Feita', status: 'done', dueAt: now - H }] })
    expect(ids(r)).toEqual(['progress', 'overdue', 'cards'])
    expect(r[1].text).toContain('Lista 3'); expect(r[1].text).not.toContain('Feita')
  })
})
