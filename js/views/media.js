import { h, btn, field, select, askConfirm } from '../ui.js'
import { load, put, del, uid } from '../db.js'
import { parseMediaUrl } from '../core/mediaCore.js'

const NAME = { youtube: 'YouTube', spotify: 'Spotify', other: 'Link' }
const st = { q: '', prov: '', player: null }
export default async function (ctx) {
  const D = await load('media', 'subjects')
  const url = h('input', { 'aria-label': 'Link', placeholder: 'https://www.youtube.com/watch?v=… ou https://open.spotify.com/…', inputmode: 'url' })
  const title = h('input', { 'aria-label': 'Título', placeholder: 'Título (opcional)' }), notes = h('input', { 'aria-label': 'Notas', placeholder: 'Notas (opcional)' })
  const subj = select([['', 'Sem matéria'], ...D.subjects.filter((s) => !s.archived).map((s) => [s.id, s.name])], '', { 'aria-label': 'Matéria' })
  const err = h('p', { class: 'error', role: 'alert' })
  const add = async (e) => {
    e.preventDefault()
    const p = parseMediaUrl(url.value)
    if (!p) { err.textContent = 'Informe um link válido que comece com https://'; return }
    await put('media', { id: uid(), url: p.url, provider: p.provider, embedUrl: p.embedUrl, title: title.value.trim() || new URL(p.url).hostname, subjectId: subj.value || undefined, notes: notes.value.trim() || undefined, done: false, tags: [], createdAt: Date.now() })
  }
  const items = D.media.filter((m) => (!st.prov || m.provider === st.prov) && (!st.q || `${m.title} ${m.notes ?? ''}`.toLowerCase().includes(st.q.toLowerCase()))).sort((a, b) => b.createdAt - a.createdAt)
  return h('div', { class: 'stack wide' }, h('h1', null, 'Mídia'),
    h('p', { class: 'muted small' }, 'Guarde vídeos, músicas e playlists. Funciona só com links, sem login. O player incorporado depende das regras de cada plataforma (no Spotify, sem conta conectada, normalmente toca apenas trechos); sempre dá para abrir no site original.'),
    h('form', { class: 'grid', onsubmit: add }, h('div', { style: 'grid-column:1/-1' }, url), title, subj, notes, err, btn('Salvar link', null, 'primary', { type: 'submit' })),
    h('div', { class: 'row' }, h('input', { id: 'q-media', type: 'search', 'aria-label': 'Pesquisar', placeholder: 'Pesquisar', value: st.q, style: 'flex:1;min-width:8rem', oninput: (e) => { st.q = e.target.value; clearTimeout(st.t); st.t = setTimeout(ctx.rerender, 250) } }),
      select([['', 'Todas'], ['youtube', 'YouTube'], ['spotify', 'Spotify'], ['other', 'Outros']], st.prov, { 'aria-label': 'Plataforma', onchange: (e) => { st.prov = e.target.value; ctx.rerender() } })),
    items.length === 0 ? h('p', { class: 'muted' }, 'Nada salvo ainda. Cole um link acima.') : null,
    h('ul', { class: 'plain' }, items.map((m) => {
      const safe = parseMediaUrl(m.url) // o endereço do player é sempre recalculado, nunca confiado ao que está salvo
      return h('li', { class: 'card' }, h('p', { class: m.done ? 'done' : '' }, h('strong', null, m.title)),
        h('p', { class: 'muted small' }, `${NAME[m.provider]}${m.subjectId ? ' · ' + (D.subjects.find((s) => s.id === m.subjectId)?.name ?? '') : ''}${m.notes ? ' · ' + m.notes : ''}`),
        h('div', { class: 'row' }, safe ? h('a', { href: safe.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir no site') : null,
          safe && safe.embedUrl ? btn(st.player === m.id ? 'Ocultar player' : 'Mostrar player', () => { st.player = st.player === m.id ? null : m.id; ctx.rerender() }, 'link') : null,
          btn(m.done ? 'Desmarcar' : 'Marcar como concluído', () => put('media', { ...m, done: !m.done }), 'link'), btn('Apagar', () => { if (askConfirm('Apagar este link?')) del('media', m.id) }, 'link danger')),
        st.player === m.id && safe && safe.embedUrl ? h('iframe', { title: m.title, src: safe.embedUrl, loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin', sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups', allow: 'encrypted-media; picture-in-picture', style: 'width:100%;aspect-ratio:16/9;border:0;border-radius:.5rem;margin-top:.5rem' }) : null)
    })))
}
