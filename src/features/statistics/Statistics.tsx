import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, getSetting } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { focusedMs } from '../focus/timerCore'
import { comparePeriods, currentStreak, dailyTotals, formatDuration, hourDistribution, totalsBySubject } from '../dashboard/statsCore'

export function Statistics() {
  const data = useLive(async () => ({
    sessions: await db.sessions.toArray(), subjects: await db.subjects.toArray(), tasks: await db.tasks.toArray(), goalMin: await getSetting<number>('dailyGoalMin', 120),
  }))
  const [days, setDays] = useState(14)
  if (data.error) return <p role="alert">Erro ao ler estatísticas: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>

  const { sessions, subjects, tasks, goalMin } = data.data
  if (sessions.length === 0) return <div><h1 className="text-2xl font-semibold">Estatísticas</h1><p className="mt-2 text-mute">Ainda não há sessões. Os gráficos aparecem depois da primeira sessão de foco.</p></div>

  const now = Date.now()
  const daily = dailyTotals(sessions, days, now)
  const total = daily.reduce((t, d) => t + d.ms, 0)
  const goalDays = daily.filter((d) => d.ms >= goalMin * 60_000).length
  const chart = daily.map((d) => ({ dia: new Date(d.from).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }), min: Math.round(d.ms / 60000) }))
  const bySubject = [...totalsBySubject(sessions, daily[0].from, daily[daily.length - 1].to, now)]
    .map(([id, ms]) => ({ nome: subjects.find((s) => s.id === id)?.name ?? 'Sem matéria', cor: subjects.find((s) => s.id === id)?.color ?? '#a39e97', min: Math.round(ms / 60000) }))
    .sort((a, b) => b.min - a.min)
  const card = 'rounded-lg border border-graphite-600 bg-graphite-900 p-4'
  const tip = { contentStyle: { background: '#1b1b1e', border: '1px solid #35353a', color: '#ece8e3' } }

  const cmp = comparePeriods(dailyTotals(sessions, days * 2, now), days)
  const taskTime = tasks.map((t) => ({ t, ms: sessions.filter((s) => s.taskId === t.id).reduce((x, s) => x + focusedMs(s, now), 0) })).filter((x) => x.ms > 0).sort((a, b) => b.ms - a.ms).slice(0, 5)
  const heat = dailyTotals(sessions, 84, now)
  const pad = new Date(heat[0].from).getDay()
  const heatDays = heat.filter((x) => x.ms > 0).length
  const hours = hourDistribution(sessions, now)
  const hourData = hours.map((ms, h) => ({ hora: `${h}h`, min: Math.round(ms / 60000) }))
  const finished = sessions.filter((s) => s.endedAt !== undefined).length
  const bestH = hours.indexOf(Math.max(...hours))
  const observation = finished >= 10 && hours[bestH] > 0
    ? `Você concentra mais tempo de foco entre ${bestH}h e ${bestH + 1}h (${Math.round(hours[bestH] / 60000)} min no total).`
    : `Ainda há poucas sessões (${finished} de 10 necessárias) para apontar um horário mais produtivo.`
  const last7 = dailyTotals(sessions, 7, now)
  const wk = totalsBySubject(sessions, last7[0].from, last7[6].to, now)
  const goals = subjects.filter((s) => s.weeklyGoalMin && !s.archived).map((s) => ({ s, min: Math.round((wk.get(s.id) ?? 0) / 60000) }))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Estatísticas</h1>
        <select aria-label="Período" className="rounded bg-graphite-800 p-2" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
        </select>
      </div>
      <section className="grid gap-3 sm:grid-cols-4">
        <div className={card}><p className="text-sm text-mute">Total no período</p><p className="num text-2xl font-semibold text-ember">{formatDuration(total)}</p></div>
        <div className={card}><p className="text-sm text-mute">Média por dia</p><p className="num text-2xl font-semibold">{formatDuration(total / days)}</p></div>
        <div className={card}><p className="text-sm text-mute">Dias com meta cumprida</p><p className="num text-2xl font-semibold">{goalDays} de {days}</p></div>
        <div className={card}><p className="text-sm text-mute">Sequência atual</p><p className="num text-2xl font-semibold">{currentStreak(sessions, now)} dias</p></div>
      </section>
      <section className={card} aria-label="Minutos por dia">
        <h2 className="mb-2 font-semibold">Minutos focados por dia</h2>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}><CartesianGrid stroke="#26262a" vertical={false} /><XAxis dataKey="dia" stroke="#a39e97" tick={{ fontSize: 12 }} interval="preserveStartEnd" /><YAxis stroke="#a39e97" width={36} /><Tooltip {...tip} cursor={{ fill: '#26262a' }} /><Bar dataKey="min" name="Minutos" fill="#ff7a1a" radius={[3, 3, 0, 0]} /></BarChart>
        </ResponsiveContainer></div>
      </section>
      <section className={card} aria-label="Tempo por matéria">
        <h2 className="mb-2 font-semibold">Tempo por matéria</h2>
        {bySubject.length === 0 ? <p className="text-mute">Sem tempo registrado neste período.</p> : (
          <div style={{ height: 40 + bySubject.length * 36 }}><ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySubject} layout="vertical"><XAxis type="number" stroke="#a39e97" /><YAxis type="category" dataKey="nome" stroke="#a39e97" width={110} /><Tooltip {...tip} cursor={{ fill: '#26262a' }} /><Bar dataKey="min" name="Minutos">{bySubject.map((b) => <Cell key={b.nome} fill={b.cor} />)}</Bar></BarChart>
          </ResponsiveContainer></div>
        )}
      </section>
      <section className={card} aria-label="Comparação com o período anterior">
        <h2 className="mb-1 font-semibold">Comparação com os {days} dias anteriores</h2>
        <p className="num">{formatDuration(cmp.current)} agora contra {formatDuration(cmp.previous)} antes{cmp.pct !== undefined && <> ({cmp.pct >= 0 ? '+' : ''}{cmp.pct}%)</>}</p>
        {cmp.pct === undefined && <p className="text-sm text-mute">Sem tempo registrado no período anterior; não há como calcular a variação.</p>}
      </section>
      <section className={card} aria-label="Tempo por tarefa">
        <h2 className="mb-2 font-semibold">Tempo por tarefa (todo o histórico)</h2>
        {taskTime.length === 0 ? <p className="text-mute">Escolha uma tarefa ao iniciar o foco para ver o tempo gasto em cada uma.</p> : (
          <ul className="space-y-1">{taskTime.map(({ t, ms }) => <li key={t.id} className="flex justify-between gap-2"><span>{t.title}</span><span className="num text-mute">{formatDuration(ms)}{t.estimateMin ? ` de ${t.estimateMin} min estimados` : ''}</span></li>)}</ul>
        )}
      </section>
      <section className={card} aria-label="Metas semanais por matéria">
        <h2 className="mb-2 font-semibold">Metas semanais por matéria (últimos 7 dias)</h2>
        {goals.length === 0 ? <p className="text-mute">Defina uma meta semanal na página Matérias para acompanhar aqui.</p> : (
          <ul className="space-y-3">{goals.map(({ s, min }) => {
            const pct = Math.min(100, Math.round((min / s.weeklyGoalMin!) * 100))
            return <li key={s.id}><div className="flex justify-between"><span>{s.name}</span><span className="num text-mute">{min} de {s.weeklyGoalMin} min ({pct}%)</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-graphite-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Meta semanal de ${s.name}`}><div className="h-full" style={{ width: `${pct}%`, background: s.color }} /></div></li>
          })}</ul>
        )}
      </section>
      <section className={card} aria-label="Foco por horário do dia">
        <h2 className="mb-2 font-semibold">Foco por horário do dia (todo o histórico)</h2>
        <div className="h-48"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourData}><CartesianGrid stroke="#26262a" vertical={false} /><XAxis dataKey="hora" stroke="#a39e97" tick={{ fontSize: 11 }} interval={2} /><YAxis stroke="#a39e97" width={36} /><Tooltip {...tip} cursor={{ fill: '#26262a' }} /><Bar dataKey="min" name="Minutos" fill="#c77b3e" radius={[3, 3, 0, 0]} /></BarChart>
        </ResponsiveContainer></div>
        <p className="mt-2">{observation}</p>
        <p className="text-sm text-mute">Como foi calculado: soma do tempo focado de todas as sessões em cada hora do dia, sem contar pausas. Só aparece uma observação com pelo menos 10 sessões concluídas.</p>
      </section>
      <section className={card} aria-label="Mapa de calor das últimas 12 semanas">
        <h2 className="mb-2 font-semibold">Últimas 12 semanas</h2>
        <div className="overflow-x-auto"><div className="grid grid-flow-col gap-1" style={{ gridTemplateRows: 'repeat(7, 1rem)' }}>
          {Array.from({ length: pad }).map((_, i) => <span key={`p${i}`} className="h-4 w-4" aria-hidden />)}
          {heat.map((x) => <span key={x.from} title={`${new Date(x.from).toLocaleDateString()}: ${Math.round(x.ms / 60000)} min`} className="h-4 w-4 rounded-sm"
            style={{ background: x.ms > 0 ? `rgba(255,122,26,${0.2 + Math.min(1, x.ms / 60000 / goalMin) * 0.8})` : '#26262a' }} />)}
        </div></div>
        <p className="mt-2 text-sm text-mute">{heatDays} de 84 dias com foco. Cada coluna é uma semana (domingo a sábado); cor mais forte = mais perto da meta diária.</p>
      </section>
      <p className="text-sm text-mute">Valores calculados a partir das sessões salvas; ficam aproximados se houver registros incompletos.</p>
    </div>
  )
}
