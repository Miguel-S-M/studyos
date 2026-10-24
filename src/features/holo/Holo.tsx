import { Link } from 'react-router-dom'
import { db, getSetting, setSetting } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { isDueToday } from '../memory-lab/srsCore'
import { buildSuggestions } from './coachCore'
import { DEFAULT_PREFS, PERSONALITIES, type HoloPrefs } from './personalities'

export function Holo() {
  const d = useLive(async () => ({
    prefs: { ...DEFAULT_PREFS, ...(await getSetting<Partial<HoloPrefs>>('holoPrefs', {})) },
    sessions: await db.sessions.toArray(), tasks: await db.tasks.toArray(), cards: await db.flashcards.toArray(), goalMin: await getSetting<number>('dailyGoalMin', 120),
  }))
  if (d.error) return <p role="alert">Erro ao ler dados: {d.error}</p>
  if (!d.data) return <p className="text-mute" role="status">Carregando…</p>
  const { prefs, sessions, tasks, cards, goalMin } = d.data
  const now = Date.now()
  const persona = PERSONALITIES.find((p) => p.id === prefs.personality) ?? PERSONALITIES[1]
  const list = buildSuggestions({ sessions, tasks, dueCards: cards.filter((c) => isDueToday(c.state, now)).length, goalMin, now })
  const save = (p: Partial<HoloPrefs>) => setSetting('holoPrefs', { ...prefs, ...p })

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Holo</h1>
      <p className="text-sm text-mute">Holo local: sugestões calculadas por regras com os seus dados. Não é uma IA generativa e nada sai do seu navegador.</p>
      <section className="space-y-2" aria-label="Sugestões de hoje">
        {prefs.motivational && <p className="rounded-lg border border-copper bg-graphite-900 p-4 italic">{persona.label}: “{persona.line}”</p>}
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id}><Link to={s.to} className="block rounded-lg border border-graphite-600 bg-graphite-900 p-3 hover:border-ember">{s.text} <span className="text-copper-soft">Abrir</span></Link></li>
          ))}
        </ul>
        {list.length === 0 && <p className="text-mute">Tudo em dia por enquanto.</p>}
      </section>
      <section className="space-y-3" aria-label="Preferências do Holo">
        <h2 className="font-semibold">Personalidade</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERSONALITIES.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-lg border bg-graphite-900 p-3 ${prefs.personality === p.id ? 'border-ember' : 'border-graphite-600'}`}>
              <input type="radio" name="persona" className="mr-2" checked={prefs.personality === p.id} onChange={() => void save({ personality: p.id })} />
              <span className="font-medium">{p.label}</span> <span className="text-sm text-mute">{p.about}</span>
            </label>
          ))}
        </div>
        <label className="flex gap-2"><input type="checkbox" checked={prefs.motivational} onChange={(e) => void save({ motivational: e.target.checked })} />Mostrar frase motivacional</label>
      </section>
    </div>
  )
}
