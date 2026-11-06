import { h, btn, field, select, askConfirm, fmtDateTime, downloadText } from '../ui.js'
import { load, put, del, uid } from '../db.js'
import { focusedMs, pausedMs } from '../core/timerCore.js'
import { formatDuration, startOfLocalDay } from '../core/statsCore.js'
import { sessionsToCsv } from '../core/csvCore.js'
import { fromInput, toInput, validateRange } from '../core/manualCore.js'

const DAY = 86_400_000
const f = { range: 'week', subject: '', kind: '' } // filtros sobrevivem às atualizações
let formFor = null // 'new' ou id da sessão em edição

export default async function (ctx) {
  const D = await load('sessions', 'subjects')
  const now = Date.now(), today = startOfLocalDay(now)
  const from = { day: today, week: today - 6 * DAY, month: today - 29 * DAY, all: 0 }[f.range]
  const name = (id) => D.subjects.find((s) => s.id === id)?.name ?? 'Sem matéria'
  const rows = D.sessions.filter((s) => s.startedAt >= from && (!f.subject || s.subjectId === f.subject) && (!f.kind || s.kind === f.kind)).sort((a, b) => b.startedAt - a.startedAt)
  const total = rows.reduce((t, s) => t + focusedMs(s, now), 0)
  const flt = (k, opts, label) => select(opts, f[k], { 'aria-label': label, onchange: (e) => { f[k] = e.target.value; ctx.rerender() } })
  const subs = D.subjects.filter((s) => !s.archived)

  function form(initial) {
    const start = h('input', { type: 'datetime-local', value: toInput(initial?.startedAt ?? now - 3_600_000) }), end = h('input', { type: 'datetime-local', value: toInput(initial?.endedAt ?? now) })
    const subj = select([['', 'Sem matéria'], ...subs.map((s) => [s.id, s.name])], initial?.subjectId ?? '', { 'aria-label': 'Matéria' })
    const notes = h('input', { placeholder: 'Notas', 'aria-label': 'Notas', value: initial?.notes ?? '' })
    const err = h('p', { class: 'error', role: 'alert' })
    const submit = async (e) => {
      e.preventDefault()
      const s = fromInput(start.value), t = fromInput(end.value), bad = validateRange(s, t, Date.now())
      if (bad) { err.textContent = bad; return }
      formFor = null
      if (initial) { const times = initial.startedAt !== s || initial.endedAt !== t; await put('sessions', { ...initial, startedAt: s, endedAt: t, subjectId: subj.value || undefined, notes: notes.value.trim() || undefined, manual: true, ...(times ? { pauses: [] } : {}) }) }
      else await put('sessions', { id: uid(), startedAt: s, endedAt: t, pauses: [], subjectId: subj.value || undefined, notes: notes.value.trim() || undefined, kind: 'free', origin: 'local', manual: true })
    }
    return h('form', { class: 'card hot grid', onsubmit: submit }, field('Início', start), field('Fim', end), subj, notes,
      initial && initial.pauses.length ? h('p', { class: 'muted small' }, 'Alterar os horários remove as pausas registradas desta sessão.') : null, err,
      h('div', { class: 'row' }, btn('Salvar', null, 'primary', { type: 'submit' }), btn('Cancelar', () => { formFor = null; ctx.rerender() })))
  }

  return h('div', { class: 'stack wide' }, h('h1', null, 'Histórico'),
    formFor === 'new' ? form() : btn('Adicionar sessão manual', () => { formFor = 'new'; ctx.rerender() }),
    h('div', { class: 'row' }, flt('range', [['day', 'Hoje'], ['week', 'Últimos 7 dias'], ['month', 'Últimos 30 dias'], ['all', 'Tudo']], 'Período'),
      flt('subject', [['', 'Todas as matérias'], ...D.subjects.map((s) => [s.id, s.name])], 'Matéria'), flt('kind', [['', 'Todos os tipos'], ['free', 'Livre'], ['pomodoro', 'Pomodoro'], ['countdown', 'Regressiva']], 'Tipo'),
      btn('Exportar CSV', () => downloadText('studyos-historico.csv', '\ufeff' + sessionsToCsv(rows, name, now), 'text/csv;charset=utf-8'), '', rows.length ? {} : { disabled: true })),
    h('p', { class: 'muted num' }, `${rows.length} sessões, ${formatDuration(total)} de foco`),
    rows.length === 0 ? h('p', { class: 'muted' }, 'Nenhuma sessão neste filtro. Inicie um foco na página Foco.') : null,
    h('ul', { class: 'plain' }, rows.map((s) => formFor === s.id ? h('li', null, form(s)) : h('li', { class: 'card' },
      h('div', { class: 'row between' }, h('strong', null, name(s.subjectId)), h('span', { class: 'ember num' }, formatDuration(focusedMs(s, now)) + (s.endedAt ? '' : ' (em andamento)'))),
      h('p', { class: 'muted small num' }, `${fmtDateTime(s.startedAt)} · ${s.kind}${s.manual ? ' (manual)' : ''} · pausas: ${formatDuration(pausedMs(s, now))}`),
      s.notes ? h('p', { class: 'small' }, s.notes) : null,
      h('div', { class: 'row' }, s.endedAt !== undefined ? btn('Editar', () => { formFor = s.id; ctx.rerender() }, 'link') : null, btn('Apagar', () => { if (askConfirm('Apagar esta sessão definitivamente?')) del('sessions', s.id) }, 'link danger'))))))
}
