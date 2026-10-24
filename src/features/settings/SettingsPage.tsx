import { useState } from 'react'
import { db, getSetting, setSetting } from '../../services/storage/db'
import { exportBackup, importBackup, parseBackup } from '../../services/storage/backup'
import { downloadText } from '../../services/storage/download'
import { useLive } from '../../hooks/useLive'
import { sanitizeCfg, type PomodoroCfg } from '../focus/pomodoroCore'
import { enableNotifications } from '../../services/notify'

const btn = 'rounded-md border border-graphite-600 px-4 py-2 hover:bg-graphite-700'
export function SettingsPage() {
  const goal = useLive(() => getSetting<number>('dailyGoalMin', 120))
  const pomo = useLive(async () => sanitizeCfg(await getSetting('pomodoro', {})))
  const notif = useLive(() => getSetting<boolean>('notifications', false))
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function doExport() {
    const b = await exportBackup()
    downloadText(`studyos-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2), 'application/json')
    setMsg({ ok: true, text: `Backup exportado: ${b.sessions.length} sessões, ${b.tasks.length} tarefas, ${b.subjects.length} matérias.` })
  }
  async function doImport(file: File) {
    const r = parseBackup(await file.text())
    if (!r.ok) return setMsg({ ok: false, text: r.error })
    const n = r.data
    if (!confirm(`Importar ${n.sessions.length} sessões, ${n.tasks.length} tarefas e ${n.subjects.length} matérias, ${n.flashcards.length} cartões e ${n.insights.length} insights e ${n.books.length} livros? Nada do que você já tem será apagado.`)) return
    try { await importBackup(n); setMsg({ ok: true, text: 'Importação concluída.' }) }
    catch (e) { setMsg({ ok: false, text: `Falha ao importar: ${String((e as Error).message)}` }) }
  }
  async function wipe() {
    if (!confirm('Apagar TODOS os dados deste navegador? Exporte um backup antes. Esta ação não pode ser desfeita.')) return
    await Promise.all([db.subjects.clear(), db.tasks.clear(), db.sessions.clear(), db.flashcards.clear(), db.reviewEvents.clear(), db.insights.clear(), db.books.clear(), db.readingSessions.clear(), db.media.clear(), db.settings.clear()])
    setMsg({ ok: true, text: 'Dados apagados.' })
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <section className="space-y-2">
        <h2 className="font-semibold">Meta diária</h2>
        <label className="block">Minutos por dia
          <input type="number" min={1} max={1440} className="num mt-1 block rounded bg-graphite-800 p-2" key={goal.data} defaultValue={goal.data ?? 120}
            onBlur={(e) => { const v = Math.min(1440, Math.max(1, Number(e.target.value) || 120)); void setSetting('dailyGoalMin', v) }} />
        </label>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Pomodoro</h2>
        {pomo.data && (
          <div className="grid grid-cols-2 gap-2" key={JSON.stringify(pomo.data)}>
            {([['focusMin', 'Foco (min)'], ['shortMin', 'Pausa curta (min)'], ['longMin', 'Pausa longa (min)'], ['cycles', 'Ciclos até a pausa longa']] as [keyof PomodoroCfg, string][]).map(([k, l]) => (
              <label key={k} className="block text-sm">{l}
                <input type="number" className="num mt-1 block w-full rounded bg-graphite-800 p-2" defaultValue={pomo.data![k]}
                  onBlur={(e) => void setSetting('pomodoro', sanitizeCfg({ ...pomo.data, [k]: e.target.value }))} />
              </label>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-1">
        <h2 className="font-semibold">Avisos</h2>
        <label className="flex gap-2"><input type="checkbox" checked={notif.data === true} onChange={async (e) => {
          if (!e.target.checked) return void setSetting('notifications', false)
          const r = await enableNotifications()
          if (r === 'granted') void setSetting('notifications', true)
          else setMsg({ ok: false, text: r === 'unsupported' ? 'Este navegador não suporta avisos.' : 'O navegador bloqueou os avisos. Libere nas permissões do site e tente de novo.' })
        }} />Avisar quando um tempo definido terminar</label>
        <p className="text-sm text-mute">Funciona só com a aba do StudyOS aberta (pode ficar em segundo plano).</p>
      </section>
      <section className="space-y-1">
        <h2 className="font-semibold">Privacidade</h2>
        <p className="text-sm text-mute">O StudyOS não usa conta, nuvem nem servidor: tudo fica neste navegador e nada é enviado para fora. Para levar seus dados a outro aparelho, exporte e importe o backup abaixo.</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Backup dos dados</h2>
        <p className="text-sm text-mute">Seus dados ficam só neste navegador. Limpar os dados do site ou perder o aparelho os elimina; exporte um backup com frequência.</p>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => void doExport()}>Exportar JSON</button>
          <label className={`${btn} cursor-pointer`}>Importar JSON
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = '' }} />
          </label>
          <button className={`${btn} text-red-400`} onClick={() => void wipe()}>Apagar tudo</button>
        </div>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-copper-soft' : 'text-red-400'}>{msg.text}</p>}
      </section>
    </div>
  )
}
