// Avisos locais do navegador (só funcionam com a aba aberta). Nada passa por servidor.
export const notificationsSupported = () => typeof Notification !== 'undefined'
export async function enableNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  return p === 'granted' ? 'granted' : 'denied'
}
export function notify(title: string, body: string) {
  try { if (notificationsSupported() && Notification.permission === 'granted') new Notification(title, { body }) } catch { /* sem permissão ou bloqueado */ }
}
