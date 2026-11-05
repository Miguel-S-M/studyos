export const MAX_COVER_PX = 360
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] // SVG fica de fora de propósito
const MAX_FILE = 8 * 1024 * 1024

export function fitSize(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) }
}

/** Reduz a imagem no próprio navegador e devolve um JPEG pequeno (data URL) para guardar no IndexedDB. */
export async function fileToCover(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > MAX_FILE) throw new Error('A imagem passa de 8 MB. Escolha uma menor.')
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) } catch { throw new Error('Não foi possível ler esta imagem.') }
  const { w, h } = fitSize(bmp.width, bmp.height, MAX_COVER_PX)
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('O navegador não conseguiu processar a imagem.')
  ctx.drawImage(bmp, 0, 0, w, h); bmp.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}
