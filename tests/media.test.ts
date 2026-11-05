import { describe, expect, it } from 'vitest'
import { parseMediaUrl } from '../src/features/media-hub/mediaCore'

describe('links de mídia', () => {
  it('YouTube: watch, youtu.be, shorts e playlist viram embed sem cookies', () => {
    expect(parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(parseMediaUrl('https://youtu.be/dQw4w9WgXcQ?t=5')?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(parseMediaUrl('https://www.youtube.com/shorts/abcDEF12345')?.provider).toBe('youtube')
    expect(parseMediaUrl('https://www.youtube.com/playlist?list=PLabcdefghij1234567890')?.embedUrl).toContain('videoseries?list=PLabc')
  })
  it('Spotify: faixa e playlist', () => {
    expect(parseMediaUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x')?.embedUrl).toBe('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M')
    expect(parseMediaUrl('https://open.spotify.com/intl-pt/track/4uLU6hMCjMI75M1A2tKUQC')?.provider).toBe('spotify')
  })
  it('rejeita esquemas perigosos e texto solto; outros sites viram link simples', () => {
    expect(parseMediaUrl('javascript:alert(1)')).toBeNull()
    expect(parseMediaUrl('data:text/html,x')).toBeNull()
    expect(parseMediaUrl('não é link')).toBeNull()
    expect(parseMediaUrl('https://exemplo.com/aula')?.provider).toBe('other')
    expect(parseMediaUrl('https://exemplo.com/aula')?.embedUrl).toBeUndefined()
  })
  it('id inválido de YouTube não gera embed', () => { expect(parseMediaUrl('https://www.youtube.com/watch?v=<x>')?.embedUrl).toBeUndefined() })
})
