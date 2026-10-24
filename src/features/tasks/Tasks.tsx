import { useState } from 'react'
import { db, type Task } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { focusedMs } from '../focus/timerCore'
import { formatDuration } from '../dashboard/statsCore'

const PRI = { high: 0, medium: 1, low: 2 } as const
const LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' } as const
const field = 'rounded bg-graphite-800 p-2'

export function Tasks() {
  const data = useLive(async () => ({ tasks: await db.tasks.toArray(), subjects: await db.subjects.toArray(), sessions: await db.sessions.toArray() }))
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [due, setDue] = useState('')
  const [est, setEst] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [listName, setListName] = useState('')
  const [listFilter, setListFilter] = useState('')
  const [tag, setTag] = useState('')
  const [show, setShow] = useState<'open' | 'done' | 'all'>('open')
  const [newSub, setNewSub] = useState<Record<string, string>>({})

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await db.tasks.add({
      id: crypto.randomUUID(), title: title.trim(), subjectId: subjectId || undefined, priority, status: 'pending',
      dueAt: due ? new Date(`${due}T23:59:59`).getTime() : undefined, estimateMin: est ? Math.max(1, Number(est)) : undefined,
      subtasks: [], list: listName.trim().slice(0, 40) || undefined, tags: tagsText.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 10), createdAt: Date.now(),
    })
    setTitle(''); setDue(''); setEst(''); setTagsText(''); setListName('')
  }
  if (data.error) return <p role="alert">Erro ao ler tarefas: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>

  const now = Date.now()
  const { subjects, sessions } = data.data
  const open = (t: Task) => t.status === 'pending' || t.status === 'doing'
  const tasks = data.data.tasks.filter((t) => t.status !== 'archived' && (show === 'all' || (show === 'open' ? open(t) : t.status === 'done')) && (!tag || t.tags.includes(tag)) && (!listFilter || t.list === listFilter))
    .sort((a, b) => PRI[a.priority] - PRI[b.priority] || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))
  const allTags = [...new Set(data.data.tasks.flatMap((t) => t.tags))].sort()
  const allLists = [...new Set(data.data.tasks.map((t) => t.list).filter((x): x is string => !!x))].sort()
  const spent = (id: string) => sessions.filter((s) => s.taskId === id).reduce((t, s) => t + focusedMs(s, now), 0)
  const toggle = (t: Task) => db.tasks.update(t.id, t.status === 'done' ? { status: 'pending', completedAt: undefined } : { status: 'done', completedAt: Date.now() })
  const toggleSub = (t: Task, sid: string) => db.tasks.update(t.id, { subtasks: t.subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)) })
  const addSub = async (t: Task) => {
    const v = (newSub[t.id] ?? '').trim()
    if (!v) return
    await db.tasks.update(t.id, { subtasks: [...t.subtasks, { id: crypto.randomUUID(), title: v, done: false }] })
    setNewSub({ ...newSub, [t.id]: '' })
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Tarefas</h1>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Título" className={`${field} sm:col-span-2`} placeholder="Nova tarefa" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <select aria-label="Matéria" className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Sem matéria</option>{subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Prioridade" className={field} value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
          <option value="high">Prioridade alta</option><option value="medium">Prioridade média</option><option value="low">Prioridade baixa</option>
        </select>
        <input aria-label="Prazo" type="date" className={field} value={due} onChange={(e) => setDue(e.target.value)} />
        <input aria-label="Estimativa em minutos" type="number" min={1} className={`${field} num`} placeholder="Estimativa (min)" value={est} onChange={(e) => setEst(e.target.value)} />
        <input aria-label="Lista" list="task-lists" className={field} placeholder="Lista (ex.: Faculdade)" value={listName} onChange={(e) => setListName(e.target.value)} maxLength={40} />
        <datalist id="task-lists">{allLists.map((x) => <option key={x} value={x} />)}</datalist>
        <input aria-label="Tags" className={`${field} sm:col-span-2`} placeholder="Tags separadas por vírgula (opcional)" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        <button className="rounded-md bg-ember px-4 py-2 font-medium text-ink sm:col-span-2">Adicionar tarefa</button>
      </form>
      <select aria-label="Filtro" className={field} value={show} onChange={(e) => setShow(e.target.value as typeof show)}>
        <option value="open">Abertas</option><option value="done">Concluídas</option><option value="all">Todas</option>
      </select>
      {allLists.length > 0 && <select aria-label="Filtrar por lista" className={field} value={listFilter} onChange={(e) => setListFilter(e.target.value)}><option value="">Todas as listas</option>{allLists.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
      {allTags.length > 0 && <select aria-label="Filtrar por tag" className={field} value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas as tags</option>{allTags.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
      {tasks.length === 0 && <p className="text-mute">Nenhuma tarefa aqui. Adicione uma acima.</p>}
      <ul className="space-y-2">
        {tasks.map((t) => {
          const late = open(t) && t.dueAt !== undefined && t.dueAt < now
          const real = spent(t.id)
          return (
            <li key={t.id} className={`rounded-lg border bg-graphite-900 p-3 ${late ? 'border-ember' : 'border-graphite-600'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={`Concluir ${t.title}`} className="mt-1 h-5 w-5 accent-orange-500" checked={t.status === 'done'} onChange={() => void toggle(t)} />
                <div className="flex-1">
                  <p className={t.status === 'done' ? 'line-through text-mute' : ''}>{t.title}</p>
                  <p className="num text-sm text-mute">
                    {LABEL[t.priority]}{t.subjectId && ` · ${subjects.find((s) => s.id === t.subjectId)?.name ?? ''}`}
                    {t.dueAt !== undefined && ` · prazo ${new Date(t.dueAt).toLocaleDateString()}`}{late && ' (vencida)'}{t.list && ` · lista ${t.list}`}{t.tags.length > 0 && ` · ${t.tags.map((x) => '#' + x).join(' ')}`}
                    {(t.estimateMin || real > 0) && ` · real ${formatDuration(real)}${t.estimateMin ? ` de ${t.estimateMin} min estimados` : ''}`}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {t.subtasks.map((s) => (
                      <li key={s.id}><label className="flex gap-2 text-sm"><input type="checkbox" checked={s.done} onChange={() => void toggleSub(t, s.id)} />{s.title}</label></li>
                    ))}
                  </ul>
                  <input aria-label="Nova subtarefa" className="mt-1 w-full rounded bg-graphite-800 p-1 text-sm" placeholder="Adicionar subtarefa (Enter)" value={newSub[t.id] ?? ''}
                    onChange={(e) => setNewSub({ ...newSub, [t.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && void addSub(t)} />
                </div>
                <button className="text-sm text-mute hover:text-red-400" onClick={() => { if (confirm('Apagar esta tarefa definitivamente?')) void db.tasks.delete(t.id) }}>Apagar</button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
