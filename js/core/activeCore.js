export const ABANDON_AFTER_MS = 30 * 60_000;
/** Sessão rodando (não pausada) sem nenhuma aba aberta há mais de 30 min é considerada abandonada. */
export function isAbandoned(a, now) {
    const running = !a.state.pauses.some((p) => p.end === undefined);
    return running && now - a.lastSeenAt > ABANDON_AFTER_MS;
}
export function formatClock(ms) {
    const s = Math.floor(Math.max(0, ms) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const mm = String(m).padStart(2, '0'), rr = String(r).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
}
