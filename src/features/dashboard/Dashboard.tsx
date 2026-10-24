import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db, getSetting } from '../../services/storage/db'
import { DashboardExtras } from './DashboardExtras'
import { endOfLocalDay, formatDuration, startOfLocalDay, todaySummary } from './statsCore'

type View =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; focusedMs: number; completed: number; goalMin: number; total: number }

export function Dashboard() {
  const [view, setView] = useState<View>({ status: 'loading' })

  useEffect(() => {
    const sub = liveQuery(async () => {
      const now = Date.now()
      // começa 24h antes para pegar sessões que cruzam a meia-noite
      const sessions = await db.sessions.where('startedAt').below(endOfLocalDay(now)).and((s) => (s.endedAt ?? now) >= startOfLocalDay(now)).toArray()
      const goalMin = await getSetting<number>('dailyGoalMin', 120)
      return { ...todaySummary(sessions, now), goalMin, total: await db.sessions.count() }
    }).subscribe({
      next: (r) => setView({ status: 'ready', ...r }),
      error: (e) => setView({ status: 'error', message: String(e?.message ?? e) }),
    })
    return () => sub.unsubscribe()
  }, [])

  if (view.status === 'loading') return <p className="text-mute" role="status">Carregando seus dados locais…</p>
  if (view.status === 'error')
    return <p role="alert" className="rounded-lg border border-red-500/50 p-4">Não foi possível abrir o armazenamento do navegador: {view.message}. Verifique se o navegador permite IndexedDB (modo anônimo pode bloquear).</p>

  const pct = Math.min(100, Math.round((view.focusedMs / 60000 / view.goalMin) * 100))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hoje</h1>
      <section className="rounded-lg border border-graphite-600 bg-graphite-900 p-6">
        <p className="text-sm text-mute">Tempo focado hoje</p>
        <p className="num mt-1 text-5xl font-semibold text-ember">{formatDuration(view.focusedMs)}</p>
        <div className="mt-4 h-2 overflow-hidden rounded bg-graphite-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta diária">
          <div className="h-full bg-gradient-to-r from-copper to-ember" style={{ width: `${pct}%` }} />
        </div>
        <p className="num mt-2 text-sm text-mute">{pct}% da meta de {view.goalMin} min</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-graphite-600 bg-graphite-900 p-4">
          <p className="text-sm text-mute">Sessões concluídas hoje</p>
          <p className="num text-3xl font-semibold">{view.completed}</p>
        </div>
        <div className="rounded-lg border border-graphite-600 bg-graphite-900 p-4">
          <p className="text-sm text-mute">Sessões registradas no total</p>
          <p className="num text-3xl font-semibold">{view.total}</p>
        </div>
      </section>
      <DashboardExtras />
      {view.total === 0 && (
        <p className="text-mute">Nenhuma sessão ainda. O cronômetro chega na etapa 2; quando existir, o tempo aparecerá aqui automaticamente.</p>
      )}
    </div>
  )
}
