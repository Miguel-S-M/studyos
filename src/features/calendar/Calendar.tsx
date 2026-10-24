import { useState } from 'react'
import { db, getSetting } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { focusedMs } from '../focus/timerCore'
import { focusedMsInWindow, formatDuration } from '../dashboard/statsCore'
import { dayCell, monthGrid, weekDays } from './calendarCore'

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export function Calendar() {
  const data = useLive(async () => ({ sessions: await db.sessions.toArray(), subjects: await db.subjects.toArray(), goalMin: await getSetting<number>('dailyGoalMin', 120) }))
  const today = new Date()
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [sel, setSel] = useState<number | null>(null)
  const [mode, setMode] = useState<'month' | 'week' | 'day'>('month')
  const [anchor, setAnchor] = useState(Date.now())
  if (data.error) return <p role="alert">Erro ao ler o calendário: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>
  const { sessions, subjects, goalMin } = data.data
  const now = Date.now()
  const grid = monthGrid(ym.y, ym.m)
  const modeBar = (
    <div role="group" aria-label="Visão do calendário" className="flex w-fit overflow-hidden rounded-md border border-graphite-600">
      {(['month', 'week', 'day'] as const).map((m) => <button key={m} aria-pressed={mode === m} className={`px-3 py-1 ${mode === m ? 'bg-graphite-700 text-ember' : ''}`} onClick={() => setMode(m)}>{m === 'month' ? 'Mês' : m === 'week' ? 'Semana' : 'Dia'}</button>)}
    </div>
  )
  if (mode !== 'month') {
    const cells = mode === 'week' ? weekDays(anchor) : [dayCell(anchor)]
    const step = (n: number) => { const d = new Date(anchor); setAnchor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * (mode === 'week' ? 7 : 1)).getTime()) }
    const fmt = (t: number, o: Intl.DateTimeFormatOptions) => new Date(t).toLocaleDateString('pt-BR', o)
    return (
      <div className="max-w-2xl space-y-4">
        {modeBar}
        <div className="flex items-center justify-between">
          <button className="rounded border border-graphite-600 px-3 py-1" onClick={() => step(-1)} aria-label="Anterior">‹</button>
          <h1 className="text-center text-xl font-semibold">{mode === 'week' ? `${fmt(cells[0].from, { day: '2-digit', month: '2-digit' })} a ${fmt(cells[6].from, { day: '2-digit', month: '2-digit' })}` : fmt(cells[0].from, { dateStyle: 'full' })}</h1>
          <button className="rounded border border-graphite-600 px-3 py-1" onClick={() => step(1)} aria-label="Próximo">›</button>
        </div>
        {cells.map((c) => {
          const list = sessions.filter((s) => focusedMsInWindow(s, c.from, c.to, now) > 0).sort((a, b) => a.startedAt - b.startedAt)
          const ms = list.reduce((t, s) => t + focusedMsInWindow(s, c.from, c.to, now), 0)
          return (
            <section key={c.from} aria-label={fmt(c.from, { dateStyle: 'full' })} className="space-y-1">
              <h2 className="flex justify-between font-semibold"><span className="capitalize">{fmt(c.from, { weekday: 'long', day: '2-digit', month: '2-digit' })}</span><span className="num text-ember">{formatDuration(ms)}</span></h2>
              {list.length === 0 ? <p className="text-sm text-mute">Sem sessões.</p> : list.map((s) => (
                <p key={s.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-2">{new Date(s.startedAt).toLocaleTimeString('pt-BR', { timeStyle: 'short' })} · {subjects.find((x) => x.id === s.subjectId)?.name ?? 'Sem matéria'} · <span className="num text-ember">{formatDuration(focusedMsInWindow(s, c.from, c.to, now))}</span></p>
              ))}
            </section>
          )
        })}
      </div>
    )
  }
  const move = (n: number) => { const d = new Date(ym.y, ym.m + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }); setSel(null) }
  const title = new Date(ym.y, ym.m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const selCell = grid.flat().find((c) => c.from === sel)
  const daySessions = selCell ? sessions.filter((s) => focusedMsInWindow(s, selCell.from, selCell.to, now) > 0).sort((a, b) => a.startedAt - b.startedAt) : []

  return (
    <div className="max-w-2xl space-y-4">
      {modeBar}
      <div className="flex items-center justify-between">
        <button className="rounded border border-graphite-600 px-3 py-1" onClick={() => move(-1)} aria-label="Mês anterior">‹</button>
        <h1 className="text-xl font-semibold capitalize">{title}</h1>
        <button className="rounded border border-graphite-600 px-3 py-1" onClick={() => move(1)} aria-label="Próximo mês">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-mute">{WD.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((c) => {
          const ms = sessions.reduce((t, s) => t + focusedMsInWindow(s, c.from, c.to, now), 0)
          const ratio = Math.min(1, ms / 60000 / goalMin)
          return (
            <button key={c.from} onClick={() => setSel(c.from)} aria-label={`Dia ${c.day}, ${Math.round(ms / 60000)} minutos`} aria-pressed={sel === c.from}
              className={`num aspect-square rounded p-1 text-sm ${c.inMonth ? '' : 'opacity-30'} ${sel === c.from ? 'ring-2 ring-ember' : ''}`}
              style={{ background: ms > 0 ? `rgba(255,122,26,${0.15 + ratio * 0.65})` : '#1b1b1e' }}>
              <span className="block">{c.day}</span>{ms > 0 && <span className="block text-[10px]">{Math.round(ms / 60000)}m</span>}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-mute">A cor indica o tempo focado em relação à meta de {goalMin} min.</p>
      {selCell && (
        <section aria-label="Sessões do dia" className="space-y-2">
          <h2 className="font-semibold">{new Date(selCell.from).toLocaleDateString('pt-BR', { dateStyle: 'full' })}</h2>
          {daySessions.length === 0 && <p className="text-mute">Nenhuma sessão neste dia.</p>}
          {daySessions.map((s) => (
            <p key={s.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-2">
              {new Date(s.startedAt).toLocaleTimeString('pt-BR', { timeStyle: 'short' })} · {subjects.find((x) => x.id === s.subjectId)?.name ?? 'Sem matéria'} · <span className="num text-ember">{formatDuration(focusedMs(s, now))}</span>
            </p>
          ))}
        </section>
      )}
    </div>
  )
}
