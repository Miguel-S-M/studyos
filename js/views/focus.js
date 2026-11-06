import { h, btn, field, select, card, askConfirm } from '../ui.js'
import { load, getSetting } from '../db.js'
import { getActive, startSession, pauseSession, resumeSession, finishSession, cancelSession, heartbeat, setNotes, getBreak, cancelBreak, startBreakAfterPomodoro, notify } from '../services.js'
import { focusedMs, isPaused, remainingMs } from '../core/timerCore.js'
import { formatClock, isAbandoned } from '../core/activeCore.js'
import { sanitizeCfg } from '../core/pomodoroCore.js'

export default async function (ctx) {
  const [active, brk, cfgRaw, notifOn, D] = await Promise.all([getActive(), getBreak(), getSetting('pomodoro', {}), getSetting('notifications', false), load('subjects', 'tasks', 'media')])
  return active ? running(ctx, active, D, notifOn) : setup(ctx, D, sanitizeCfg(cfgRaw), brk)
}

function setup(ctx, D, cfg, brk) {
  const kindSel = select([['free', 'Cronômetro livre'], ['pomodoro', 'Pomodoro'], ['countdown', 'Contagem regressiva']], 'free', { 'aria-label': 'Modo' })
  const minutes = h('input', { type: 'number', min: 1, max: 600, value: cfg.focusMin, 'aria-label': 'Duração em minutos' })
  const minField = field('Duração (minutos)', minutes, 'hide')
  kindSel.addEventListener('change', () => { const k = kindSel.value; minField.classList.toggle('hide', k === 'free'); minutes.value = k === 'pomodoro' ? cfg.focusMin : 30 })
  const subj = select([['', 'Sem matéria'], ...D.subjects.filter((s) => !s.archived).map((s) => [s.id, s.name])], '')
  const task = select([['', 'Sem tarefa'], ...D.tasks.filter((t) => t.status === 'pending' || t.status === 'doing').map((t) => [t.id, t.title])], '')
  const media = select([['', 'Sem mídia'], ...D.media.map((m) => [m.id, m.title])], '')
  const start = () => {
    const kind = kindSel.value, timed = kind !== 'free'
    const mins = Math.min(600, Math.max(1, Number(minutes.value) || 25))
    return startSession({ kind, subjectId: subj.value || undefined, taskId: task.value || undefined, mediaId: media.value || undefined, targetMs: timed ? mins * 60_000 : undefined })
  }
  return h('div', { class: 'stack narrow' },
    brk ? breakView(ctx, brk) : null,
    h('h1', null, 'Iniciar foco'),
    field('Modo', kindSel), minField, field('Matéria', subj), field('Tarefa (opcional)', task), field('Mídia (opcional)', media),
    D.subjects.length === 0 ? h('p', { class: 'muted small' }, 'Você ainda não tem matérias. Crie uma na página Matérias para classificar o tempo.') : null,
    btn('Iniciar', start, 'primary'))
}

function breakView(ctx, b) {
  const t = h('p', { class: 'huge', style: 'color:var(--copper2)' }), status = h('p', { class: 'font' })
  const tick = () => { const left = Math.max(0, b.endsAt - Date.now()); t.textContent = left > 0 ? formatClock(left) : '00:00'; status.textContent = left > 0 ? `Pausa ${b.kind === 'long' ? 'longa' : 'curta'}` : 'Pausa terminada' }
  tick(); ctx.interval(tick, 500)
  return h('section', { class: 'card hot', role: 'status' }, status, t, h('p', { class: 'muted small' }, 'A pausa não conta como tempo de estudo.'), btn('Encerrar pausa', () => cancelBreak()))
}

function running(ctx, a, D, notifOn) {
  const subj = D.subjects.find((s) => s.id === a.subjectId), media = D.media.find((m) => m.id === a.mediaId)
  const timeEl = h('p', { class: 'huge', role: 'timer' }), info = h('p', { class: 'muted' })
  const tick = () => {
    const now = Date.now(), paused = isPaused(a.state)
    const shown = a.targetMs ? remainingMs(a.state, a.targetMs, now) : focusedMs(a.state, now)
    const done = !!a.targetMs && shown === 0
    timeEl.textContent = formatClock(shown)
    document.title = `${formatClock(shown)} · StudyOS`
    info.textContent = done ? 'O tempo definido terminou. Finalize para salvar.' : paused ? 'Pausado — a pausa não conta como foco.' : a.targetMs ? 'Tempo restante' : 'Tempo focado'
    if (done && notifOn) {
      const k = `notified:${a.state.id}`
      try { if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); notify('Tempo concluído', 'Finalize a sessão para salvar o tempo de foco.') } } catch { /* sem sessionStorage */ }
    }
  }
  tick(); ctx.interval(tick, 250); ctx.interval(() => heartbeat(), 30_000)
  const paused = isPaused(a.state)
  return h('div', { class: 'stack narrow' },
    h('h1', null, subj ? subj.name : 'Sessão de foco'),
    isAbandoned(a, Date.now()) ? h('section', { class: 'card late', role: 'alert' },
      h('p', null, `Esta sessão ficou sem nenhuma aba aberta desde ${new Date(a.lastSeenAt).toLocaleTimeString('pt-BR')}. O que fazer?`),
      h('div', { class: 'row' }, btn('Finalizar no último momento visto', () => finishSession(Date.now(), a.lastSeenAt), 'primary'), btn('Continuar sessão', () => heartbeat().then(() => ctx.rerender())),
        btn('Descartar', () => { if (askConfirm('Descartar esta sessão sem salvar?')) cancelSession() }))) : null,
    media ? h('p', { class: 'small' }, ['Mídia: ', h('a', { href: media.url, target: '_blank', rel: 'noopener noreferrer' }, media.title)]) : null,
    timeEl, info,
    h('textarea', { 'aria-label': 'Notas da sessão', placeholder: 'Notas da sessão', onblur: (e) => setNotes(e.target.value) }, a.notes || ''),
    h('div', { class: 'row' },
      paused ? btn('Retomar', () => resumeSession(), 'primary') : btn('Pausar', () => pauseSession()),
      btn('Finalizar e salvar', async () => { await finishSession(); if (a.kind === 'pomodoro') await startBreakAfterPomodoro() }, 'primary'),
      btn('Cancelar', () => { if (askConfirm('Cancelar sem salvar esta sessão?')) cancelSession() })))
}
