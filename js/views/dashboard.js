import { h, card, progress, fmtDate } from '../ui.js'
import { load, getSetting } from '../db.js'
import { todaySummary, formatDuration, totalsBySubject, startOfLocalDay, endOfLocalDay, currentStreak } from '../core/statsCore.js'
import { isDueToday } from '../core/srsCore.js'

export default async function () {
  const D = await load('sessions', 'subjects', 'tasks', 'flashcards')
  const goalMin = await getSetting('dailyGoalMin', 120)
  const now = Date.now()
  const { focusedMs, completed } = todaySummary(D.sessions, now)
  const pct = Math.min(100, Math.round((focusedMs / 60000 / goalMin) * 100))
  const bySub = [...totalsBySubject(D.sessions, startOfLocalDay(now), endOfLocalDay(now), now)].sort((a, b) => b[1] - a[1])
  const open = D.tasks.filter((t) => t.status === 'pending' || t.status === 'doing').sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)).slice(0, 4)
  const dueCards = D.flashcards.filter((c) => isDueToday(c.state, now)).length
  const streak = currentStreak(D.sessions, now)
  return h('div', { class: 'stack wide' },
    h('h1', null, 'Hoje'),
    card(h('p', { class: 'muted small' }, 'Tempo focado hoje'), h('p', { class: 'big' }, formatDuration(focusedMs)), progress(pct, 'Progresso da meta diária'), h('p', { class: 'muted small num' }, `${pct}% da meta de ${goalMin} min`)),
    h('div', { class: 'grid' },
      card(h('p', { class: 'muted small' }, 'Sessões concluídas hoje'), h('p', { class: 'big' }, completed)),
      card(h('p', { class: 'muted small' }, 'Sequência de dias'), h('p', { class: 'big' }, streak)),
      card(h('p', { class: 'muted small' }, 'Cartões para revisar'), h('p', { class: 'big' }, h('a', { href: '#/memoria' }, dueCards)))),
    h('div', { class: 'grid' },
      card(h('h3', null, 'Hoje por matéria'), bySub.length === 0 ? h('p', { class: 'muted' }, 'Sem foco registrado hoje.')
        : h('ul', { class: 'plain' }, bySub.map(([id, ms]) => h('li', { class: 'row between' }, h('span', null, D.subjects.find((s) => s.id === id)?.name ?? 'Sem matéria'), h('span', { class: 'muted num' }, formatDuration(ms)))))),
      card(h('h3', null, 'Próximas tarefas'), open.length === 0 ? h('p', { class: 'muted' }, 'Nenhuma tarefa aberta.')
        : h('ul', { class: 'plain' }, open.map((t) => h('li', { class: 'row between' }, h('span', null, t.title), h('span', { class: `num ${t.dueAt && t.dueAt < now ? 'ember' : 'muted'}` }, t.dueAt ? fmtDate(t.dueAt) : 'sem prazo')))))),
    D.sessions.length === 0 ? h('p', { class: 'muted' }, ['Nenhuma sessão ainda. Vá em ', h('a', { href: '#/foco' }, 'Foco'), ' para começar; o tempo aparece aqui.']) : null)
}
