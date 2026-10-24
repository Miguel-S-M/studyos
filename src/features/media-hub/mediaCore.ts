// Interpreta links de YouTube e Spotify sem credenciais e sem chamar APIs.
// Só aceita http(s). O player incorporado usa os endereços de embed oficiais e só é carregado quando o usuário pede.
export type Provider = 'youtube' | 'spotify' | 'other'
export interface ParsedMedia { url: string; provider: Provider; embedUrl?: string }

const ok = (s: string | null | undefined, max = 20): s is string => !!s && new RegExp(`^[A-Za-z0-9_-]{6,${max}}$`).test(s)

export function parseMediaUrl(input: string): ParsedMedia | null {
  let u: URL
  try { u = new URL(input.trim()) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.replace(/^(www|m)\./, '')

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1)
    return { url: u.href, provider: 'youtube', embedUrl: ok(id) ? `https://www.youtube-nocookie.com/embed/${id}` : undefined }
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
    if (ok(id)) return { url: u.href, provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` }
    const list = u.searchParams.get('list')
    if (u.pathname === '/playlist' && ok(list, 64)) return { url: u.href, provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}` }
    return { url: u.href, provider: 'youtube' }
  }
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,30})/)
    return { url: u.href, provider: 'spotify', embedUrl: m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : undefined }
  }
  return { url: u.href, provider: 'other' }
}
