import { useState } from 'react'
import { db } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { downloadText } from '../../services/storage/download'
import { focusedMs, pausedMs } from '../focus/timerCore'
import { formatDuration, startOfLocalDay } from '../dashboard/statsCore'
import { sessionsToCsv } from './csvCore'
import { SessionForm, type FormValue } from './SessionForm'

const DAY = 86_400_000
const sel = 'rounded bg-graphite-800 p-2'
export function History() {
  const data = useLive(async () => ({ sessions: await db.sessions.orderBy('startedAt').reverse().toArray(), subjects: await db.subjects.toArray() }))
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'all'>('week')
  const [subject, setSubject] = useState('')
  const [kind, setKind] = useState('')
  const [form, setForm] = useState<string | null>(null) // 'new' ou id da sessão em edição
  if (data.error) return <p role="alert">Erro ao ler o histórico: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>

  const now = Date.now(), today = startOfLocalDay(now)
  const from = { day: today, week: today - 6 * DAY, month: today - 29 * DAY, all: 0 }[range]
  const name = (id?: string) => data.data!.subjects.find((s) => s.id === id)?.name ?? 'Sem matéria'
  const rows = data.data.sessions.filter((s) => s.startedAt >= from && (!subject || s.subjectId === subject) && (!kind || s.kind === kind))
  const total = rows.reduce((t, s) => t + focusedMs(s, now), 0)

  async function save(v: FormValue) {
    if (form === 'new') await db.sessions.add({ id: crypto.randomUUID(), startedAt: v.startedAt, endedAt: v.endedAt, pauses: [], subjectId: v.subjectId, notes: v.notes, kind: 'free', origin: 'local', manual: true })
    else if (form) {
      const old = data.data!.sessions.find((s) => s.id === form)
      const times = old && (old.startedAt !== v.startedAt || old.endedAt !== v.endedAt)
      await db.sessions.update(form, { startedAt: v.startedAt, endedAt: v.endedAt, subjectId: v.subjectId, notes: v.notes, manual: true, ...(times ? { pauses: [] } : {}) })
    }
    setForm(null)
  }
  const activeSubjects = data.data.subjects.filter((s) => !s.archived)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Histórico</h1>
      {form === 'new' ? <SessionForm subjects={activeSubjects} onSave={(v) => void save(v)} onCancel={() => setForm(null)} />
        : <button className="rounded-md border border-graphite-600 px-3 py-2" onClick={() => setForm('new')}>Adicionar sessão manual</button>}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Período" className={sel} value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
          <option value="day">Hoje</option><option value="week">Últimos 7 dias</option><option value="month">Últimos 30 dias</option><option value="all">Tudo</option>
        </select>
        <select aria-label="Matéria" className={sel} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Todas as matérias</option>{data.data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Tipo" className={sel} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Todos os tipos</option><option value="free">Livre</option><option value="pomodoro">Pomodoro</option><option value="countdown">Regressiva</option>
        </select>
        <button className="rounded-md border border-graphite-600 px-3 py-2 disabled:opacity-40" disabled={rows.length === 0}
          onClick={() => downloadText('studyos-historico.csv', '\ufeff' + sessionsToCsv(rows, name, now), 'text/csv;charset=utf-8')}>Exportar CSV</button>
      </div>
      <p className="num text-mute">{rows.length} sessões, {formatDuration(total)} de foco</p>
      {rows.length === 0 && <p className="text-mute">Nenhuma sessão neste filtro. Inicie um foco na página Foco.</p>}
      <ul className="space-y-2">
        {rows.map((s) => form === s.id ? (
          <li key={s.id}><SessionForm initial={s} subjects={activeSubjects} onSave={(v) => void save(v)} onCancel={() => setForm(null)} /></li>
        ) : (
          <li key={s.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{name(s.subjectId)}</span>
              <span className="num text-ember">{formatDuration(focusedMs(s, now))}{s.endedAt ? '' : ' (em andamento)'}</span>
            </div>
            <p className="num text-sm text-mute">{new Date(s.startedAt).toLocaleString()} · {s.kind}{s.manual ? ' (manual)' : ''} · pausas: {formatDuration(pausedMs(s, now))}</p>
            {s.notes && <p className="mt-1 text-sm">{s.notes}</p>}
            {s.endedAt !== undefined && <button className="mr-3 mt-1 text-sm text-copper-soft" onClick={() => setForm(s.id)}>Editar</button>}
            <button className="mt-1 text-sm text-mute hover:text-red-400" onClick={() => { if (confirm('Apagar esta sessão definitivamente?')) void db.sessions.delete(s.id) }}>Apagar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
