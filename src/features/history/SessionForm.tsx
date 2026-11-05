import { useState } from 'react'
import type { StudySession, Subject } from '../../services/storage/db'
import { fromInput, toInput, validateRange } from './manualCore'

const field = 'rounded bg-graphite-800 p-2'
export interface FormValue { startedAt: number; endedAt: number; subjectId?: string; notes?: string }
export function SessionForm({ initial, subjects, onSave, onCancel }: { initial?: StudySession; subjects: Subject[]; onSave: (v: FormValue) => void; onCancel: () => void }) {
  const now = Date.now()
  const [start, setStart] = useState(toInput(initial?.startedAt ?? now - 3_600_000))
  const [end, setEnd] = useState(toInput(initial?.endedAt ?? now))
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [err, setErr] = useState('')
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const s = fromInput(start), f = fromInput(end)
    const bad = validateRange(s, f, Date.now())
    if (bad) return setErr(bad)
    onSave({ startedAt: s, endedAt: f, subjectId: subjectId || undefined, notes: notes.trim() || undefined })
  }
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-lg border border-copper bg-graphite-900 p-3 sm:grid-cols-2">
      <label className="block text-sm">Início<input type="datetime-local" className={`${field} num mt-1 w-full`} value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label className="block text-sm">Fim<input type="datetime-local" className={`${field} num mt-1 w-full`} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <select aria-label="Matéria" className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Sem matéria</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <input aria-label="Notas" className={field} placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {initial && initial.pauses.length > 0 && <p className="text-sm text-mute sm:col-span-2">Alterar os horários remove as pausas registradas desta sessão.</p>}
      {err && <p role="alert" className="text-red-400 sm:col-span-2">{err}</p>}
      <div className="flex gap-3 sm:col-span-2"><button className="rounded-md bg-ember px-4 py-2 font-medium text-ink">Salvar</button><button type="button" className="text-mute" onClick={onCancel}>Cancelar</button></div>
    </form>
  )
}
