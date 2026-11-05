import { describe, expect, it } from 'vitest'
import { csvCell, sessionsToCsv } from '../src/features/history/csvCore'

describe('csv', () => {
  it('escapa aspas, vírgulas e quebras de linha', () => { expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"') })
  it('neutraliza fórmulas de planilha', () => { expect(csvCell('=1+1')).toBe("'=1+1"); expect(csvCell(-5)).toBe('-5') })
  it('exporta foco sem contar pausas', () => {
    const s = { id: 'a', startedAt: 0, endedAt: 3_600_000, pauses: [{ start: 0, end: 600_000 }], kind: 'free' as const, origin: 'local' as const }
    const lines = sessionsToCsv([s], () => 'Cálculo', 0).split('\r\n')
    expect(lines[1]).toContain('Cálculo,free,50,10')
  })
})
