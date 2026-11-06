import { h, btn, field, askConfirm, downloadText } from '../ui.js'
import { getSetting, setSetting, clearAll } from '../db.js'
import { sanitizeCfg } from '../core/pomodoroCore.js'
import { enableNotifications } from '../services.js'
import { exportBackup, importBackup, parseBackup } from '../backup.js'

export default async function (ctx) {
  const [goal, pomo, notif] = await Promise.all([getSetting('dailyGoalMin', 120), getSetting('pomodoro', {}).then(sanitizeCfg), getSetting('notifications', false)])
  const msg = h('p', { role: 'status' })
  const say = (ok, text) => { msg.className = ok ? 'ember' : 'error'; msg.setAttribute('role', ok ? 'status' : 'alert'); msg.textContent = text }
  const num = (label, value, onSave, min = 1, max = 1440) => field(label, h('input', { type: 'number', min, max, value, onchange: (e) => onSave(e.target.value) }))
  const pomoField = (k, label) => num(label, pomo[k], (v) => setSetting('pomodoro', sanitizeCfg({ ...pomo, [k]: v })))

  const doExport = async () => {
    const b = await exportBackup()
    downloadText(`studyos-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2), 'application/json')
    say(true, `Backup exportado: ${b.sessions.length} sessões, ${b.tasks.length} tarefas, ${b.subjects.length} matérias, ${b.flashcards.length} cartões, ${b.books.length} livros.`)
  }
  const doImport = async (file) => {
    const r = parseBackup(await file.text())
    if (r.error) return say(false, r.error)
    const n = r.data
    if (!askConfirm(`Importar ${(n.sessions || []).length} sessões, ${(n.tasks || []).length} tarefas, ${(n.subjects || []).length} matérias, ${(n.flashcards || []).length} cartões, ${(n.insights || []).length} insights e ${(n.books || []).length} livros? Nada do que você já tem será apagado.`)) return
    try { await importBackup(n); say(true, 'Importação concluída.') } catch (e) { say(false, `Falha ao importar: ${e.message}`) }
  }
  return h('div', { class: 'stack narrow' }, h('h1', null, 'Configurações'),
    h('section', { class: 'stack' }, h('h2', null, 'Meta diária'), num('Minutos por dia', goal, (v) => setSetting('dailyGoalMin', Math.min(1440, Math.max(1, Math.round(Number(v)) || 120))))),
    h('section', { class: 'stack' }, h('h2', null, 'Pomodoro'), h('div', { class: 'grid' }, pomoField('focusMin', 'Foco (min)'), pomoField('shortMin', 'Pausa curta (min)'), pomoField('longMin', 'Pausa longa (min)'), pomoField('cycles', 'Ciclos até a pausa longa'))),
    h('section', { class: 'stack' }, h('h2', null, 'Avisos'),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: notif === true, onchange: async (e) => {
        if (!e.target.checked) return setSetting('notifications', false)
        const r = await enableNotifications()
        if (r === 'granted') setSetting('notifications', true)
        else { e.target.checked = false; say(false, r === 'unsupported' ? 'Este navegador não suporta avisos.' : 'O navegador bloqueou os avisos. Libere nas permissões do site e tente de novo.') }
      } }), 'Avisar quando um tempo definido terminar'),
      h('p', { class: 'muted small' }, 'Funciona só com a aba do StudyOS aberta (pode ficar em segundo plano).')),
    h('section', { class: 'stack' }, h('h2', null, 'Privacidade'), h('p', { class: 'muted small' }, 'O StudyOS não usa conta, nuvem nem servidor: tudo fica neste navegador, neste aparelho, e nada é enviado para fora. Para levar seus dados a outro aparelho, exporte e importe o backup abaixo.')),
    h('section', { class: 'stack' }, h('h2', null, 'Backup dos dados'),
      h('p', { class: 'muted small' }, 'Limpar os dados do site ou perder o aparelho elimina tudo; exporte um backup com frequência. Os dados do computador não aparecem no celular sem importar o backup.'),
      h('div', { class: 'row' }, btn('Exportar JSON', doExport), h('label', { class: 'btn' }, 'Importar JSON', h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) doImport(f) } })),
        btn('Apagar tudo', async () => { if (askConfirm('Apagar TODOS os dados deste navegador? Exporte um backup antes. Esta ação não pode ser desfeita.')) { await clearAll(); say(true, 'Dados apagados.') } }, 'danger')), msg))
}
