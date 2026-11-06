import { h, fmtTime } from '../ui.js'
import { load, getSetting } from '../db.js'
import { focusedMs } from '../core/timerCore.js'
import { focusedMsInWindow, formatDuration } from '../core/statsCore.js'
import { monthGrid, dayCell, weekDays } from '../core/calendarCore.js'

const st = { mode: 'month', y: new Date().getFullYear(), m: new Date().getMonth(), anchor: Date.now(), sel: null }
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const fmt = (t, o) => new Date(t).toLocaleDateString('pt-BR', o)

export default async function (ctx) {
  const D = await load('sessions', 'subjects')
  const goalMin = await getSetting('dailyGoalMin', 120), now = Date.now()
  const nameOf = (id) => D.subjects.find((s) => s.id === id)?.name ?? 'Sem matéria'
  const modeBar = h('div', { class: 'seg', role: 'group', 'aria-label': 'Visão do calendário' },
    [['month', 'Mês'], ['week', 'Semana'], ['day', 'Dia']].map(([m, l]) => h('button', { type: 'button', 'aria-pressed': String(st.mode === m), onclick: () => { st.mode = m; ctx.rerender() } }, l)))
  const sessionsOf = (c) => D.sessions.filter((s) => focusedMsInWindow(s, c.from, c.to, now) > 0).sort((a, b) => a.startedAt - b.startedAt)
  const block = (c, withTitle) => {
    const list = sessionsOf(c), ms = list.reduce((t, s) => t + focusedMsInWindow(s, c.from, c.to, now), 0)
    return h('section', { class: 'stack', 'aria-label': fmt(c.from, { dateStyle: 'full' }) },
      h('h2', { class: 'row between' }, h('span', null, fmt(c.from, withTitle ? { weekday: 'long', day: '2-digit', month: '2-digit' } : { dateStyle: 'full' })), h('span', { class: 'ember num' }, formatDuration(ms))),
      list.length === 0 ? h('p', { class: 'muted small' }, 'Sem sessões.') : h('ul', { class: 'plain' }, list.map((s) => h('li', { class: 'card' }, `${fmtTime(s.startedAt)} · ${nameOf(s.subjectId)} · `, h('span', { class: 'ember num' }, formatDuration(focusedMsInWindow(s, c.from, c.to, now)))))))
  }

  if (st.mode !== 'month') {
    const cells = st.mode === 'week' ? weekDays(st.anchor) : [dayCell(st.anchor)]
    const step = (n) => { const d = new Date(st.anchor); st.anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * (st.mode === 'week' ? 7 : 1)).getTime(); ctx.rerender() }
    const title = st.mode === 'week' ? `${fmt(cells[0].from, { day: '2-digit', month: '2-digit' })} a ${fmt(cells[6].from, { day: '2-digit', month: '2-digit' })}` : fmt(cells[0].from, { dateStyle: 'full' })
    return h('div', { class: 'stack narrow' }, modeBar, h('div', { class: 'row between' }, h('button', { class: 'btn', 'aria-label': 'Anterior', onclick: () => step(-1) }, '‹'), h('h1', { style: 'margin:0;text-align:center' }, title), h('button', { class: 'btn', 'aria-label': 'Próximo', onclick: () => step(1) }, '›')), cells.map((c) => block(c, true)))
  }

  const grid = monthGrid(st.y, st.m)
  const move = (n) => { const d = new Date(st.y, st.m + n, 1); st.y = d.getFullYear(); st.m = d.getMonth(); st.sel = null; ctx.rerender() }
  const selCell = grid.flat().find((c) => c.from === st.sel)
  return h('div', { class: 'stack narrow' }, modeBar,
    h('div', { class: 'row between' }, h('button', { class: 'btn', 'aria-label': 'Mês anterior', onclick: () => move(-1) }, '‹'), h('h1', { style: 'margin:0;text-transform:capitalize' }, new Date(st.y, st.m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })), h('button', { class: 'btn', 'aria-label': 'Próximo mês', onclick: () => move(1) }, '›')),
    h('div', { class: 'cal' }, WD.map((w) => h('span', { class: 'wd' }, w)), grid.flat().map((c) => {
      const ms = D.sessions.reduce((t, s) => t + focusedMsInWindow(s, c.from, c.to, now), 0), ratio = Math.min(1, ms / 60000 / goalMin)
      return h('button', { type: 'button', class: c.inMonth ? '' : 'out', 'aria-pressed': String(st.sel === c.from), 'aria-label': `Dia ${c.day}, ${Math.round(ms / 60000)} minutos`,
        style: `background:${ms > 0 ? `rgba(255,122,26,${0.15 + ratio * 0.65})` : 'var(--g8)'}`, onclick: () => { st.sel = c.from; ctx.rerender() } }, h('span', { style: 'display:block' }, c.day), ms > 0 ? h('span', { class: 'num', style: 'font-size:.6rem' }, `${Math.round(ms / 60000)}m`) : null)
    })),
    h('p', { class: 'muted small' }, `A cor indica o tempo focado em relação à meta de ${goalMin} min.`), selCell ? block(selCell, false) : null)
}
