// Funciona offline depois da primeira visita. Rede primeiro: sempre mostra a versão mais nova quando há internet.
const CACHE = 'studyos-site-v2'
const FILES = ["./", "index.html", "icon.svg", "css/style.css", "js/backup.js", "js/core/activeCore.js", "js/core/calendarCore.js", "js/core/coachCore.js", "js/core/coverUtil.js", "js/core/csvCore.js", "js/core/manualCore.js", "js/core/mediaCore.js", "js/core/personalities.js", "js/core/pomodoroCore.js", "js/core/readingCore.js", "js/core/shelfCore.js", "js/core/srsCore.js", "js/core/statsCore.js", "js/core/timerCore.js", "js/db.js", "js/main.js", "js/services.js", "js/ui.js", "js/validate.js", "js/views/calendar.js", "js/views/dashboard.js", "js/views/focus.js", "js/views/history.js", "js/views/holo.js", "js/views/insights.js", "js/views/library.js", "js/views/media.js", "js/views/memory.js", "js/views/settings.js", "js/views/stats.js", "js/views/subjects.js", "js/views/tasks.js"]
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)) } return res }).catch(() => caches.match(r).then((m) => m || caches.match('index.html'))))
})
