import { useState } from 'react'
import { db } from '../../services/storage/db'
import { useLive } from '../../hooks/useLive'
import { parseMediaUrl } from './mediaCore'

const field = 'rounded bg-graphite-800 p-2'
const NAME = { youtube: 'YouTube', spotify: 'Spotify', other: 'Link' } as const

export function MediaHub() {
  const data = useLive(async () => ({ items: await db.media.toArray(), subjects: await db.subjects.toArray() }))
  const [url, setUrl] = useState(''); const [title, setTitle] = useState(''); const [subjectId, setSubjectId] = useState(''); const [notes, setNotes] = useState('')
  const [err, setErr] = useState(''); const [q, setQ] = useState(''); const [prov, setProv] = useState('')
  const [player, setPlayer] = useState<string | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const p = parseMediaUrl(url)
    if (!p) return setErr('Informe um link válido que comece com https://')
    setErr('')
    await db.media.add({ id: crypto.randomUUID(), url: p.url, provider: p.provider, embedUrl: p.embedUrl, title: title.trim() || new URL(p.url).hostname, subjectId: subjectId || undefined, notes: notes.trim() || undefined, done: false, tags: [], createdAt: Date.now() })
    setUrl(''); setTitle(''); setNotes('')
  }
  if (data.error) return <p role="alert">Erro ao ler a mídia: {data.error}</p>
  if (!data.data) return <p className="text-mute" role="status">Carregando…</p>
  const { subjects } = data.data
  const items = data.data.items.filter((m) => (!prov || m.provider === prov) && (!q || `${m.title} ${m.notes ?? ''}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Mídia</h1>
      <p className="text-sm text-mute">Guarde vídeos, músicas e playlists. Funciona só com links, sem login. O player incorporado depende das regras de cada plataforma (no Spotify, sem conta conectada, normalmente toca apenas trechos); sempre dá para abrir no site original.</p>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Link" className={`${field} sm:col-span-2`} placeholder="https://www.youtube.com/watch?v=… ou https://open.spotify.com/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input aria-label="Título" className={field} placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select aria-label="Matéria" className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Sem matéria</option>{subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input aria-label="Notas" className={`${field} sm:col-span-2`} placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {err && <p role="alert" className="text-red-400 sm:col-span-2">{err}</p>}
        <button className="rounded-md bg-ember px-4 py-2 font-medium text-ink sm:col-span-2">Salvar link</button>
      </form>
      <div className="flex gap-2">
        <input aria-label="Pesquisar" type="search" className={`${field} flex-1`} placeholder="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Plataforma" className={field} value={prov} onChange={(e) => setProv(e.target.value)}><option value="">Todas</option><option value="youtube">YouTube</option><option value="spotify">Spotify</option><option value="other">Outros</option></select>
      </div>
      {items.length === 0 && <p className="text-mute">Nada salvo ainda. Cole um link acima.</p>}
      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.id} className="rounded-lg border border-graphite-600 bg-graphite-900 p-3">
            <p className={m.done ? 'line-through text-mute' : 'font-medium'}>{m.title}</p>
            <p className="text-sm text-mute">{NAME[m.provider]}{m.subjectId && ` · ${subjects.find((s) => s.id === m.subjectId)?.name ?? ''}`}{m.notes && ` · ${m.notes}`}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              <a className="text-copper-soft underline" href={m.url} target="_blank" rel="noopener noreferrer">Abrir no site</a>
              {m.embedUrl && <button className="text-copper-soft" onClick={() => setPlayer(player === m.id ? null : m.id)}>{player === m.id ? 'Ocultar player' : 'Mostrar player'}</button>}
              <button className="text-copper-soft" onClick={() => void db.media.update(m.id, { done: !m.done })}>{m.done ? 'Desmarcar' : 'Marcar como concluído'}</button>
              <button className="text-mute hover:text-red-400" onClick={() => { if (confirm('Apagar este link?')) void db.media.delete(m.id) }}>Apagar</button>
            </div>
            {player === m.id && m.embedUrl && (
              <iframe title={m.title} src={m.embedUrl} className="mt-2 aspect-video w-full rounded" loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allow="encrypted-media; picture-in-picture" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
