import { db, getSetting } from '../../services/storage/db'
import { endOfLocalDay, startOfLocalDay } from '../dashboard/statsCore'
import { nextBreak, sanitizeCfg } from './pomodoroCore'

const KEY = 'activeBreak'
export interface ActiveBreak { kind: 'short' | 'long'; endsAt: number; durationMs: number }
export const getBreak = async () => (await db.settings.get(KEY))?.value as ActiveBreak | undefined
export const cancelBreak = () => db.settings.delete(KEY)

/** A pausa NÃO vira sessão de estudo: é só uma contagem guardada à parte. */
export async function startBreakAfterPomodoro(now = Date.now()): Promise<ActiveBreak> {
  const cfg = sanitizeCfg(await getSetting('pomodoro', {}))
  const from = startOfLocalDay(now), to = endOfLocalDay(now)
  const done = await db.sessions.filter((s) => s.kind === 'pomodoro' && s.endedAt !== undefined && s.endedAt >= from && s.endedAt < to).count()
  const b = nextBreak(done, cfg)
  const ab: ActiveBreak = { kind: b.kind, durationMs: b.minutes * 60_000, endsAt: now + b.minutes * 60_000 }
  await db.settings.put({ key: KEY, value: ab })
  return ab
}
