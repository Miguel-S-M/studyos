import { useEffect, useState } from 'react'
import { db } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { formatClock, isAbandoned, type ActiveSession } from './activeCore'
import { cancelSession, finishSession, getActive, heartbeat, pauseSession, resumeSession, setNotes, startSession } from './sessionService'
import { focusedMs, isPaused, remainingMs } from './timerCore'
import { getSetting } from '../../services/storage/db'
import { cancelBreak, getBreak, startBreakAfterPomodoro } from './breakService'
import { sanitizeCfg } from './pomodoroCore'
import { notify } from '../../services/notify'

const btn = 'rounded-md px-4 py-2 font-medium disabled:opacity-40'
const primary = `${btn} bg-ember text-ink hover:bg-copper-soft`
const ghost = `${btn} border border-graphite-600 hover:bg-graphite-700`

export function Focus() {
  const active = useLive(async () => ({ a: await getActive() }))
  const subjects = useLive(() => db.subjects.toArray())
  const cfg = useLive(async () => ({ p: sanitizeCfg(await getSetting('pomodoro', {})), brk: await getBreak() }))
  const [now, setNow] = useState(Date.now())

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])
  useEffect(() => { const t = setInterval(() => void heartbeat(), 30_000); return () => clearInterval(t) }, [])

  if (active.error) return <p role="alert">Erro ao ler a sessão: {active.error}</p>
  if (!active.data) return <p className="text-mute" role="status">Carregando…</p>
  const a = active.data.a
  return a
    ? <Running a={a} now={now} subjectName={subjects.data?.find((s) => s.id === a.subjectId)?.name} />
    : <>
        {cfg.data?.brk && <BreakView b={cfg.data.brk} now={now} />}
        <Setup subjects={(subjects.data ?? []).filter((s) => !s.archived)} pomodoroMin={cfg.data?.p.focusMin ?? 25} />
      </>
}

function BreakView({ b, now }: { b: { kind: 'short' | 'long'; endsAt: number }; now: number }) {
  const left = Math.max(0, b.endsAt - now)
  return (
    <div className="mb-6 max-w-md rounded-lg border border-copper bg-graphite-900 p-4" role="status">
      <p className="font-medium">{left > 0 ? `Pausa ${b.kind === 'long' ? 'longa' : 'curta'}` : 'Pausa terminada'}</p>
      {left > 0 && <p className="num text-4xl font-semibold text-copper-soft">{formatClock(left)}</p>}
      <p className="text-sm text-mute">A pausa não conta como tempo de estudo.</p>
      <button className="mt-2 rounded-md border border-graphite-600 px-3 py-1" onClick={() => void cancelBreak()}>{left > 0 ? 'Pular pausa' : 'Encerrar pausa'}</button>
    </div>
  )
}

function Setup({ subjects, pomodoroMin }: { subjects: { id: string; name: string }[]; pomodoroMin: number }) {
  const [kind, setKind] = useState<ActiveSession['kind']>('free')
  const [minutes, setMinutes] = useState(25)
  const [subjectId, setSubjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [mediaId, setMediaId] = useState('')
  const media = useLive(() => db.media.toArray())
  const tasks = useLive(() => db.tasks.toArray())
  const timed = kind !== 'free'
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Iniciar foco</h1>
      <label className="block">Modo
        <select className="mt-1 w-full rounded bg-graphite-800 p-2" value={kind} onChange={(e) => { const k = e.target.value as ActiveSession['kind']; setKind(k); setMinutes(k === 'pomodoro' ? pomodoroMin : 30) }}>
          <option value="free">Cronômetro livre</option>
          <option value="pomodoro">Pomodoro</option>
          <option value="countdown">Contagem regressiva</option>
        </select>
      </label>
      {timed && (
        <label className="block">Duração (minutos)
          <input type="number" min={1} max={600} className="num mt-1 w-full rounded bg-graphite-800 p-2" value={minutes} onChange={(e) => setMinutes(Math.min(600, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
      )}
      <label className="block">Matéria
        <select className="mt-1 w-full rounded bg-graphite-800 p-2" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Sem matéria</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="block">Tarefa (opcional)
        <select className="mt-1 w-full rounded bg-graphite-800 p-2" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">Sem tarefa</option>
          {(tasks.data ?? []).filter((t) => t.status === 'pending' || t.status === 'doing').map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </label>
      <label className="block">Mídia (opcional)
        <select className="mt-1 w-full rounded bg-graphite-800 p-2" value={mediaId} onChange={(e) => setMediaId(e.target.value)}>
          <option value="">Sem mídia</option>
          {(media.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </label>
      {subjects.length === 0 && <p className="text-sm text-mute">Você ainda não tem matérias. Crie uma na página Matérias para classificar o tempo.</p>}
      <button className={primary} onClick={() => void startSession({ kind, subjectId: subjectId || undefined, taskId: taskId || undefined, mediaId: mediaId || undefined, targetMs: timed ? minutes * 60_000 : undefined })}>Iniciar</button>
    </div>
  )
}

function Running({ a, now, subjectName }: { a: ActiveSession; now: number; subjectName?: string }) {
  const paused = isPaused(a.state)
  const abandoned = isAbandoned(a, now)
  const shown = a.targetMs ? remainingMs(a.state, a.targetMs, now) : focusedMs(a.state, now)
  const done = !!a.targetMs && shown === 0
  const linked = useLive(async () => (a.mediaId ? await db.media.get(a.mediaId) : undefined), [a.mediaId])
  const notif = useLive(() => getSetting<boolean>('notifications', false))
  const notifyOn = notif.data === true
  useEffect(() => {
    if (!done || !notifyOn) return
    const k = `notified:${a.state.id}`
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch { /* sem sessionStorage */ }
    notify('Tempo concluído', 'Finalize a sessão para salvar o tempo de foco.')
  }, [done, notifyOn, a.state.id])
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">{subjectName ?? 'Sessão de foco'}</h1>
      {abandoned && (
        <div role="alert" className="rounded-lg border border-copper p-4">
          <p>Esta sessão ficou sem nenhuma aba aberta desde {new Date(a.lastSeenAt).toLocaleTimeString()}. O que você quer fazer?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={primary} onClick={() => void finishSession(Date.now(), a.lastSeenAt)}>Finalizar no último momento visto</button>
            <button className={ghost} onClick={() => void heartbeat()}>Continuar sessão</button>
            <button className={ghost} onClick={() => { if (confirm('Descartar esta sessão sem salvar?')) void cancelSession() }}>Descartar</button>
          </div>
        </div>
      )}
      {linked.data && <p className="text-sm">Mídia: <a className="text-copper-soft underline" href={linked.data.url} target="_blank" rel="noopener noreferrer">{linked.data.title}</a></p>}
      <p className="num text-7xl font-semibold text-ember" role="timer" aria-live="off">{formatClock(shown)}</p>
      <p className="text-mute">{done ? 'O tempo definido terminou. Finalize para salvar.' : paused ? 'Pausado — a pausa não conta como foco.' : a.targetMs ? 'Tempo restante' : 'Tempo focado'}</p>
      <textarea aria-label="Notas da sessão" placeholder="Notas da sessão" className="h-24 w-full rounded bg-graphite-800 p-2" defaultValue={a.notes} onBlur={(e) => void setNotes(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {paused ? <button className={primary} onClick={() => void resumeSession()}>Retomar</button> : <button className={ghost} onClick={() => void pauseSession()}>Pausar</button>}
        <button className={primary} onClick={async () => { await finishSession(); if (a.kind === 'pomodoro') await startBreakAfterPomodoro() }}>Finalizar e salvar</button>
        <button className={ghost} onClick={() => { if (confirm('Cancelar sem salvar esta sessão?')) void cancelSession() }}>Cancelar</button>
      </div>
    </div>
  )
}
