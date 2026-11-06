import { load, run, STORE_NAMES } from './db.js'
import { validateBackup, BACKUP_STORES } from './validate.js'
import { parseMediaUrl } from './core/mediaCore.js'

const SKIP = new Set(['activeSession', 'activeReading', 'activeBreak']) // sessões em andamento não entram no backup
export async function exportBackup(only) {
  const d = await load(...STORE_NAMES)
  const out = { app: 'studyos', version: 1, exportedAt: Date.now() }
  for (const s of BACKUP_STORES) out[s] = only && !only.includes(s) ? [] : d[s]
  out.settings = only && !only.includes('settings') ? [] : d.settings.filter((r) => !SKIP.has(r.key))
  return out
}
export function parseBackup(text) {
  let raw
  try { raw = JSON.parse(text) } catch { return { error: 'O arquivo não é um JSON válido.' } }
  const error = validateBackup(raw)
  return error ? { error } : { data: raw }
}
/** Mescla por id: não apaga nada e importar duas vezes não duplica. Links de mídia são revalidados. */
export async function importBackup(b) {
  const counts = {}
  await run(STORE_NAMES, 'readwrite', async (x) => {
    for (const s of BACKUP_STORES) {
      let n = 0
      for (const r of b[s] || []) {
        if (s === 'settings' && SKIP.has(r.key)) continue
        let row = r
        if (s === 'media') { const p = parseMediaUrl(r.url); if (!p) continue; row = { ...r, url: p.url, provider: p.provider, embedUrl: p.embedUrl } }
        await x.put(s, row); n++
      }
      counts[s] = n
    }
  })
  return counts
}
