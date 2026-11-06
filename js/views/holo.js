import { h } from '../ui.js'
import { load, getSetting, setSetting } from '../db.js'
import { isDueToday } from '../core/srsCore.js'
import { buildSuggestions } from '../core/coachCore.js'
import { DEFAULT_PREFS, PERSONALITIES } from '../core/personalities.js'

export default async function () {
  const D = await load('sessions', 'tasks', 'flashcards')
  const prefs = { ...DEFAULT_PREFS, ...(await getSetting('holoPrefs', {})) }, goalMin = await getSetting('dailyGoalMin', 120), now = Date.now()
  const persona = PERSONALITIES.find((p) => p.id === prefs.personality) || PERSONALITIES[1]
  const list = buildSuggestions({ sessions: D.sessions, tasks: D.tasks, dueCards: D.flashcards.filter((c) => isDueToday(c.state, now)).length, goalMin, now })
  const save = (p) => setSetting('holoPrefs', { ...prefs, ...p })
  return h('div', { class: 'stack narrow' }, h('h1', null, 'Holo'),
    h('p', { class: 'muted small' }, 'Holo local: sugestões calculadas por regras com os seus dados. Não é uma IA generativa e nada sai do seu navegador.'),
    prefs.motivational ? h('p', { class: 'card hot', style: 'font-style:italic' }, `${persona.label}: “${persona.line}”`) : null,
    h('ul', { class: 'plain', 'aria-label': 'Sugestões de hoje' }, list.map((s) => h('li', null, h('a', { class: 'card', style: 'display:block;text-decoration:none;color:inherit', href: `#${s.to}` }, s.text, ' ', h('span', { style: 'color:var(--copper2)' }, 'Abrir'))))),
    list.length === 0 ? h('p', { class: 'muted' }, 'Tudo em dia por enquanto.') : null,
    h('h2', null, 'Personalidade'),
    h('div', { class: 'grid' }, PERSONALITIES.map((p) => h('label', { class: 'card', style: prefs.personality === p.id ? 'border-color:var(--ember)' : '' },
      h('input', { type: 'radio', name: 'persona', checked: prefs.personality === p.id, onchange: () => save({ personality: p.id }) }), ' ', h('strong', null, p.label), h('span', { class: 'muted small', style: 'display:block' }, p.about)))),
    h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: prefs.motivational, onchange: (e) => save({ motivational: e.target.checked }) }), 'Mostrar frase motivacional'))
}
