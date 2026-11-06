import { h, card, select, bars, hbars, progress } from '../ui.js'
import { load, getSetting } from '../db.js'
import { focusedMs } from '../core/timerCore.js'
import { comparePeriods, currentStreak, dailyTotals, formatDuration, hourDistribution, totalsBySubject } from '../core/statsCore.js'

const st = { days: 14 }
export default async function (ctx) {
  const D = await load('sessions', 'subjects', 'tasks'), goalMin = await getSetting('dailyGoalMin', 120)
  if (D.sessions.length === 0) return h('div', { class: 'stack narrow' }, h('h1', null, 'Estatísticas'), h('p', { class: 'muted' }, 'Ainda não há sessões. Os gráficos aparecem depois da primeira sessão de foco.'))
  const now = Date.now(), days = st.days
  const daily = dailyTotals(D.sessions, days, now), total = daily.reduce((t, d) => t + d.ms, 0)
  const goalDays = daily.filter((d) => d.ms >= goalMin * 60_000).length, cmp = comparePeriods(dailyTotals(D.sessions, days * 2, now), days)
  const subjOf = (id) => D.subjects.find((s) => s.id === id)
  const bySubject = [...totalsBySubject(D.sessions, daily[0].from, daily[daily.length - 1].to, now)].map(([id, ms]) => ({ label: subjOf(id)?.name ?? 'Sem matéria', value: Math.round(ms / 60000), color: subjOf(id)?.color ?? '#a39e97', text: `${Math.round(ms / 60000)} min` })).sort((a, b) => b.value - a.value)
  const hours = hourDistribution(D.sessions, now), bestH = hours.indexOf(Math.max(...hours)), finished = D.sessions.filter((s) => s.endedAt !== undefined).length
  const last7 = dailyTotals(D.sessions, 7, now), wk = totalsBySubject(D.sessions, last7[0].from, last7[6].to, now)
  const goals = D.subjects.filter((s) => s.weeklyGoalMin && !s.archived).map((s) => ({ s, min: Math.round((wk.get(s.id) ?? 0) / 60000) }))
  const taskTime = D.tasks.map((t) => ({ t, ms: D.sessions.filter((s) => s.taskId === t.id).reduce((x, s) => x + focusedMs(s, now), 0) })).filter((x) => x.ms > 0).sort((a, b) => b.ms - a.ms).slice(0, 5)
  const heat = dailyTotals(D.sessions, 84, now), pad = new Date(heat[0].from).getDay()
  const stat = (l, v) => card(h('p', { class: 'muted small' }, l), h('p', { class: 'big', style: 'font-size:1.6rem' }, v))

  return h('div', { class: 'stack wide' },
    h('div', { class: 'row between' }, h('h1', { style: 'margin:0' }, 'Estatísticas'), select([[7, '7 dias'], [14, '14 dias'], [30, '30 dias'], [90, '90 dias']], days, { 'aria-label': 'Período', onchange: (e) => { st.days = Number(e.target.value); ctx.rerender() } })),
    h('div', { class: 'grid' }, stat('Total no período', formatDuration(total)), stat('Média por dia', formatDuration(total / days)), stat('Dias com meta cumprida', `${goalDays} de ${days}`), stat('Sequência atual', `${currentStreak(D.sessions, now)} dias`)),
    card(h('h2', { style: 'margin-top:0' }, 'Minutos focados por dia'), bars(daily.map((d, i) => ({ label: days <= 14 || i % Math.ceil(days / 10) === 0 ? new Date(d.from).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '', value: Math.round(d.ms / 60000), title: `${new Date(d.from).toLocaleDateString('pt-BR')}: ${Math.round(d.ms / 60000)} min` })))),
    card(h('h2', { style: 'margin-top:0' }, 'Tempo por matéria'), bySubject.length ? hbars(bySubject) : h('p', { class: 'muted' }, 'Sem tempo registrado neste período.')),
    card(h('h2', { style: 'margin-top:0' }, `Comparação com os ${days} dias anteriores`), h('p', { class: 'num' }, `${formatDuration(cmp.current)} agora contra ${formatDuration(cmp.previous)} antes${cmp.pct !== undefined ? ` (${cmp.pct >= 0 ? '+' : ''}${cmp.pct}%)` : ''}`),
      cmp.pct === undefined ? h('p', { class: 'muted small' }, 'Sem tempo registrado no período anterior; não há como calcular a variação.') : null),
    card(h('h2', { style: 'margin-top:0' }, 'Tempo por tarefa (todo o histórico)'), taskTime.length ? h('ul', { class: 'plain' }, taskTime.map(({ t, ms }) => h('li', { class: 'row between' }, h('span', null, t.title), h('span', { class: 'muted num' }, formatDuration(ms) + (t.estimateMin ? ` de ${t.estimateMin} min estimados` : ''))))) : h('p', { class: 'muted' }, 'Escolha uma tarefa ao iniciar o foco para ver o tempo gasto em cada uma.')),
    card(h('h2', { style: 'margin-top:0' }, 'Metas semanais por matéria (últimos 7 dias)'), goals.length ? h('ul', { class: 'plain' }, goals.map(({ s, min }) => { const pct = Math.min(100, Math.round((min / s.weeklyGoalMin) * 100)); return h('li', null, h('div', { class: 'row between' }, h('span', null, s.name), h('span', { class: 'muted num' }, `${min} de ${s.weeklyGoalMin} min (${pct}%)`)), progress(pct, `Meta semanal de ${s.name}`, s.color)) })) : h('p', { class: 'muted' }, 'Defina uma meta semanal na página Matérias para acompanhar aqui.')),
    card(h('h2', { style: 'margin-top:0' }, 'Foco por horário do dia (todo o histórico)'), bars(hours.map((ms, i) => ({ label: i % 3 === 0 ? `${i}h` : '', value: Math.round(ms / 60000), title: `${i}h: ${Math.round(ms / 60000)} min` })), { color: 'var(--copper)', height: 110 }),
      h('p', null, finished >= 10 && hours[bestH] > 0 ? `Você concentra mais tempo de foco entre ${bestH}h e ${bestH + 1}h (${Math.round(hours[bestH] / 60000)} min no total).` : `Ainda há poucas sessões (${finished} de 10 necessárias) para apontar um horário mais produtivo.`),
      h('p', { class: 'muted small' }, 'Como foi calculado: soma do tempo focado de todas as sessões em cada hora do dia, sem contar pausas. Só aparece uma observação com pelo menos 10 sessões concluídas.')),
    card(h('h2', { style: 'margin-top:0' }, 'Últimas 12 semanas'), h('div', { class: 'heat', role: 'img', 'aria-label': `${heat.filter((x) => x.ms > 0).length} de 84 dias com foco` },
      Array.from({ length: pad }, () => h('i')), heat.map((x) => h('span', { title: `${new Date(x.from).toLocaleDateString('pt-BR')}: ${Math.round(x.ms / 60000)} min`, style: x.ms > 0 ? `background:rgba(255,122,26,${0.2 + Math.min(1, x.ms / 60000 / goalMin) * 0.8})` : '' }))),
      h('p', { class: 'muted small' }, `${heat.filter((x) => x.ms > 0).length} de 84 dias com foco. Cada coluna é uma semana (domingo a sábado); cor mais forte = mais perto da meta diária.`)),
    h('p', { class: 'muted small' }, 'Valores calculados a partir das sessões salvas; ficam aproximados se houver registros incompletos.'))
}
