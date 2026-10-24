export interface Cell { from: number; to: number; day: number; inMonth: boolean }
/** Grade de semanas (domingo a sábado) do mês; usa datas locais, então o horário de verão não desloca os dias. */
export function monthGrid(year: number, month: number): Cell[][] {
  const start = new Date(year, month, 1 - new Date(year, month, 1).getDay())
  const weeks: Cell[][] = []
  for (let w = 0; w < 6; w++) {
    const row: Cell[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i)
      row.push({ from: d.getTime(), to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(), day: d.getDate(), inMonth: d.getMonth() === month })
    }
    if (w > 0 && !row.some((c) => c.inMonth)) break
    weeks.push(row)
  }
  return weeks
}

export function dayCell(t: number): Cell {
  const d = new Date(t)
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return { from: from.getTime(), to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1).getTime(), day: from.getDate(), inMonth: true }
}
/** Os 7 dias (domingo a sábado) da semana que contém `t`. */
export function weekDays(t: number): Cell[] {
  const d = new Date(t)
  return Array.from({ length: 7 }, (_, i) => dayCell(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + i).getTime()))
}
