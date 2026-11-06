import { h, btn, field, select, askConfirm, fmtDate } from '../ui.js'
import { load, put, del, uid } from '../db.js'
import { focusedMs } from '../core/timerCore.js'
import { formatDuration } from '../core/statsCore.js'

const PRI = { high: 0, medium: 1, low: 2 }, LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' }
const filters = { show: 'open', tag: '', list: '' } // sobrevivem às atualizações da tela

export default async function () {
  const D = await load('tasks', 'subjects', 'sessions')
  const now = Date.now()
  const open = (t) => t.status === 'pending' || t.status === 'doing'
  const lists = [...new Set(D.tasks.map((t) => t.list).filter(Boolean))].sort()
  const tags = [...new Set(D.tasks.flatMap((t) => t.tags))].sort()
  const shown = D.tasks.filter((t) => t.status !== 'archived' && (filters.show === 'all' || (filters.show === 'open' ? open(t) : t.status === 'done')) && (!filters.tag || t.tags.includes(filters.tag)) && (!filters.list || t.list === filters.list))
    .sort((a, b) => PRI[a.priority] - PRI[b.priority] || (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))

  const title = h('input', { 'aria-label': 'Título', placeholder: 'Nova tarefa', maxlength: 200 })
  const subj = select([['', 'Sem matéria'], ...D.subjects.filter((s) => !s.archived).map((s) => [s.id, s.name])], '', { 'aria-label': 'Matéria' })
  const pri = select([['high', 'Prioridade alta'], ['medium', 'Prioridade média'], ['low', 'Prioridade baixa']], 'medium', { 'aria-label': 'Prioridade' })
  const due = h('input', { type: 'date', 'aria-label': 'Prazo' })
  const est = h('input', { type: 'number', min: 1, placeholder: 'Estimativa (min)', 'aria-label': 'Estimativa em minutos' })
  const list = h('input', { list: 'task-lists', placeholder: 'Lista (ex.: Faculdade)', 'aria-label': 'Lista', maxlength: 40 })
  const tagsIn = h('input', { placeholder: 'Tags separadas por vírgula', 'aria-label': 'Tags' })
  const add = async (e) => {
    e.preventDefault()
    if (!title.value.trim()) return
    await put('tasks', { id: uid(), title: title.value.trim(), subjectId: subj.value || undefined, priority: pri.value, status: 'pending', dueAt: due.value ? new Date(`${due.value}T23:59:59`).getTime() : undefined,
      estimateMin: est.value ? Math.max(1, Number(est.value)) : undefined, list: list.value.trim().slice(0, 40) || undefined, subtasks: [], tags: tagsIn.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 10), createdAt: Date.now() })
  }
  const flt = (key, opts, label) => select(opts, filters[key], { 'aria-label': label, onchange: (e) => { filters[key] = e.target.value; e.target.dispatchEvent(new CustomEvent('refilter', { bubbles: true })) } })
  const item = (t) => {
    const late = open(t) && t.dueAt !== undefined && t.dueAt < now
    const spent = D.sessions.filter((s) => s.taskId === t.id).reduce((x, s) => x + focusedMs(s, now), 0)
    const meta = [LABEL[t.priority], t.subjectId && D.subjects.find((s) => s.id === t.subjectId)?.name, t.dueAt !== undefined && `prazo ${fmtDate(t.dueAt)}${late ? ' (vencida)' : ''}`,
      t.list && `lista ${t.list}`, t.tags.length > 0 && t.tags.map((x) => '#' + x).join(' '), (t.estimateMin || spent > 0) && `real ${formatDuration(spent)}${t.estimateMin ? ` de ${t.estimateMin} min estimados` : ''}`].filter(Boolean).join(' · ')
    const subIn = h('input', { 'aria-label': 'Nova subtarefa', placeholder: 'Adicionar subtarefa (Enter)', style: 'font-size:.85rem', onkeydown: async (e) => {
      if (e.key !== 'Enter' || !e.target.value.trim()) return
      await put('tasks', { ...t, subtasks: [...t.subtasks, { id: uid(), title: e.target.value.trim(), done: false }] })
    } })
    return h('li', { class: `card ${late ? 'late' : ''}` }, h('div', { class: 'row', style: 'align-items:flex-start;flex-wrap:nowrap' },
      h('input', { type: 'checkbox', 'aria-label': `Concluir ${t.title}`, checked: t.status === 'done', style: 'margin-top:.35rem', onchange: () => put('tasks', { ...t, status: t.status === 'done' ? 'pending' : 'done', completedAt: t.status === 'done' ? undefined : Date.now() }) }),
      h('div', { style: 'flex:1;min-width:0' }, h('p', { class: t.status === 'done' ? 'done' : '' }, t.title), h('p', { class: 'muted small num' }, meta),
        h('ul', { class: 'plain' }, t.subtasks.map((s) => h('li', null, h('label', { class: 'row small' }, h('input', { type: 'checkbox', checked: s.done, onchange: () => put('tasks', { ...t, subtasks: t.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) }) }), s.title)))), subIn),
      btn('Apagar', () => { if (askConfirm('Apagar esta tarefa definitivamente?')) del('tasks', t.id) }, 'link danger')))
  }
  const root = h('div', { class: 'stack wide' }, h('h1', null, 'Tarefas'),
    h('form', { class: 'grid', onsubmit: add }, title, subj, pri, due, est, list, h('datalist', { id: 'task-lists' }, lists.map((x) => h('option', { value: x }))), tagsIn, btn('Adicionar tarefa', null, 'primary', { type: 'submit' })),
    h('div', { class: 'row' }, flt('show', [['open', 'Abertas'], ['done', 'Concluídas'], ['all', 'Todas']], 'Filtro'),
      lists.length ? flt('list', [['', 'Todas as listas'], ...lists.map((x) => [x, x])], 'Filtrar por lista') : null, tags.length ? flt('tag', [['', 'Todas as tags'], ...tags.map((x) => [x, x])], 'Filtrar por tag') : null),
    shown.length === 0 ? h('p', { class: 'muted' }, 'Nenhuma tarefa aqui. Adicione uma acima.') : null, h('ul', { class: 'plain' }, shown.map(item)))
  root.addEventListener('refilter', () => window.dispatchEvent(new CustomEvent('studyos:data', { detail: { remote: false } })))
  return root
}
