export const startTimer = (id, now) => ({ id, startedAt: now, pauses: [] });
export const isPaused = (s) => s.pauses.some((p) => p.end === undefined);
export const isFinished = (s) => s.endedAt !== undefined;
export function pauseTimer(s, now) {
    if (isFinished(s) || isPaused(s))
        return s; // idempotente: clique duplo não cria 2 pausas
    return { ...s, pauses: [...s.pauses, { start: Math.max(now, s.startedAt) }] };
}
export function resumeTimer(s, now) {
    if (isFinished(s) || !isPaused(s))
        return s;
    return { ...s, pauses: s.pauses.map((p) => (p.end === undefined ? { ...p, end: Math.max(now, p.start) } : p)) };
}
export function finishTimer(s, now) {
    if (isFinished(s))
        return s;
    const closed = resumeTimer(s, now);
    return { ...closed, endedAt: Math.max(now, s.startedAt) };
}
export function pausedMs(s, now) {
    const stop = s.endedAt ?? now;
    return s.pauses.reduce((sum, p) => sum + Math.max(0, Math.min(p.end ?? stop, stop) - p.start), 0);
}
/** Tempo focado = tempo decorrido - pausas. Nunca negativo (relógio do sistema pode voltar). */
export function focusedMs(s, now) {
    const stop = s.endedAt ?? now;
    return Math.max(0, stop - s.startedAt - pausedMs(s, now));
}
export const remainingMs = (s, targetMs, now) => Math.max(0, targetMs - focusedMs(s, now));
