import { db } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { endOfLocalDay, formatDuration, startOfLocalDay, totalsBySubject } from './statsCore'

export function DashboardExtras() {
  const d = useLive(async () => ({ sessions: await db.sessions.toArray(), subjects: await db.subjects.toArray(), tasks: await db.tasks.toArray() }))
  if (!d.data) return null
  const now = Date.now()
  const today = [...totalsBySubject(d.data.sessions, startOfLocalDay(now), endOfLocalDay(now), now)].sort((a, b) => b[1] - a[1])
  const next = d.data.tasks.filter((t) => t.status === 'pending' || t.status === 'doing')
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)).slice(0, 4)
  const card = 'rounded-lg border border-graphite-600 bg-graphite-900 p-4'
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className={card}>
        <h2 className="font-semibold">Hoje por matéria</h2>
        {today.length === 0 ? <p className="mt-1 text-mute">Sem foco registrado hoje.</p> : (
          <ul className="mt-2 space-y-1">{today.map(([id, ms]) => (
            <li key={id ?? 'none'} className="flex justify-between"><span>{d.data!.subjects.find((s) => s.id === id)?.name ?? 'Sem matéria'}</span><span className="num text-mute">{formatDuration(ms)}</span></li>
          ))}</ul>
        )}
      </div>
      <div className={card}>
        <h2 className="font-semibold">Próximas tarefas</h2>
        {next.length === 0 ? <p className="mt-1 text-mute">Nenhuma tarefa aberta.</p> : (
          <ul className="mt-2 space-y-1">{next.map((t) => (
            <li key={t.id} className="flex justify-between gap-2"><span>{t.title}</span>
              <span className={`num shrink-0 ${t.dueAt && t.dueAt < now ? 'text-ember' : 'text-mute'}`}>{t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'sem prazo'}</span></li>
          ))}</ul>
        )}
      </div>
    </section>
  )
}
