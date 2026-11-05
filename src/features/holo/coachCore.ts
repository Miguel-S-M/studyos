// Holo LOCAL: sugestões calculadas por regras simples sobre os seus dados. Não é IA generativa e nada sai do navegador.
import { currentStreak, dailyTotals } from '../dashboard/statsCore'
import type { TimerState } from '../focus/timerCore'

export interface Suggestion { id: string; text: string; to: string }
export interface CoachInput {
  sessions: TimerState[]
  tasks: { title: string; status: string; dueAt?: number }[]
  dueCards: number
  goalMin: number
  now: number
}

export function buildSuggestions(i: CoachInput): Suggestion[] {
  const out: Suggestion[] = []
  const days = dailyTotals(i.sessions, 2, i.now) // [ontem, hoje]
  const todayMin = Math.round(days[1].ms / 60000)
  const streak = currentStreak(i.sessions, i.now)

  if (todayMin === 0) {
    out.push({ id: 'start', text: `Você ainda não registrou foco hoje. Meta: ${i.goalMin} min.`, to: '/foco' })
    if (streak > 0) out.push({ id: 'streak', text: `Estudar hoje mantém sua sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}.`, to: '/foco' })
  } else if (todayMin < i.goalMin) {
    out.push({ id: 'progress', text: `Hoje: ${todayMin} de ${i.goalMin} min (${Math.round((todayMin / i.goalMin) * 100)}%). Faltam ${i.goalMin - todayMin} min.`, to: '/foco' })
  } else {
    out.push({ id: 'goal', text: `Meta diária cumprida: ${todayMin} min de ${i.goalMin}.`, to: '/estatisticas' })
  }

  const open = i.tasks.filter((t) => t.status === 'pending' || t.status === 'doing')
  const overdue = open.filter((t) => t.dueAt !== undefined && t.dueAt < i.now)
  if (overdue.length) out.push({ id: 'overdue', text: `${overdue.length} ${overdue.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'}: ${overdue.slice(0, 3).map((t) => t.title).join(', ')}.`, to: '/tarefas' })
  if (i.dueCards > 0) out.push({ id: 'cards', text: `${i.dueCards} ${i.dueCards === 1 ? 'cartão espera' : 'cartões esperam'} revisão hoje.`, to: '/memoria' })
  if (i.sessions.length === 0 && open.length === 0 && i.dueCards === 0) out.push({ id: 'empty', text: 'Ainda não há dados. Crie uma matéria e inicie sua primeira sessão.', to: '/materias' })
  return out
}
