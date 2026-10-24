export function validateRange(startedAt: number, endedAt: number, now: number): string | null {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return 'Informe o início e o fim.'
  if (endedAt <= startedAt) return 'O fim precisa ser depois do início.'
  if (endedAt > now) return 'O fim não pode estar no futuro.'
  if (endedAt - startedAt > 24 * 3_600_000) return 'Uma sessão não pode passar de 24 horas.'
  return null
}
const p2 = (n: number) => String(n).padStart(2, '0')
/** Formato do <input type="datetime-local"> em horário local. */
export const toInput = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}` }
export const fromInput = (s: string) => (s ? new Date(s).getTime() : NaN)
