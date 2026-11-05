import { useState } from 'react'
import { db, type Subject } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'

const field = 'rounded bg-graphite-800 p-2'
export function Subjects() {
  const list = useLive(() => db.subjects.toArray())
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ff7a1a')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    await db.subjects.add({ id: crypto.randomUUID(), name: n, color, archived: false, createdAt: Date.now() })
    setName('')
  }
  const save = async (s: Subject) => {
    const n = draft.trim()
    if (n) await db.subjects.update(s.id, { name: n })
    setEditing(null)
  }

  if (list.error) return <p role="alert">Erro ao ler matérias: {list.error}</p>
  const subjects = [...(list.data ?? [])].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name))
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Matérias</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input aria-label="Nome da matéria" className={`${field} flex-1`} placeholder="Nome da matéria" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <input aria-label="Cor" type="color" className="h-10 w-12 rounded bg-graphite-800" value={color} onChange={(e) => setColor(e.target.value)} />
        <button className="rounded-md bg-ember px-4 py-2 font-medium text-ink">Adicionar</button>
      </form>
      {list.data && subjects.length === 0 && <p className="text-mute">Nenhuma matéria ainda. Adicione a primeira acima.</p>}
      <ul className="space-y-2">
        {subjects.map((s) => (
          <li key={s.id} className={`flex items-center gap-3 rounded-lg border border-graphite-600 bg-graphite-900 p-3 ${s.archived ? 'opacity-60' : ''}`}>
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
            {editing === s.id
              ? <input autoFocus aria-label="Novo nome" className={`${field} flex-1`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save(s)} />
              : <span className="flex-1">{s.name}{s.archived && ' (arquivada)'}</span>}
            <label className="flex items-center gap-1 text-sm text-mute">Meta/sem
              <input type="number" min={0} max={10080} aria-label={`Meta semanal em minutos de ${s.name}`} className="num w-16 rounded bg-graphite-800 p-1" defaultValue={s.weeklyGoalMin ?? ''} placeholder="min"
                onBlur={(e) => { const v = Math.min(10080, Math.max(0, Math.round(Number(e.target.value) || 0))); void db.subjects.update(s.id, { weeklyGoalMin: v || undefined }) }} />
            </label>
            {editing === s.id
              ? <button className="text-copper-soft" onClick={() => void save(s)}>Salvar</button>
              : <button className="text-copper-soft" onClick={() => { setEditing(s.id); setDraft(s.name) }}>Editar</button>}
            <button className="text-mute hover:text-bone" onClick={() => void db.subjects.update(s.id, { archived: !s.archived })}>{s.archived ? 'Reativar' : 'Arquivar'}</button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-mute">Arquivar não apaga o histórico de sessões da matéria.</p>
    </div>
  )
}
