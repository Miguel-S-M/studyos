import { h, btn, card } from '../ui.js'
import { all, put, uid } from '../db.js'

export default async function (ctx) {
  const list = (await all('subjects')).sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name, 'pt-BR'))
  const name = h('input', { 'aria-label': 'Nome da matéria', placeholder: 'Nome da matéria', maxlength: 80 })
  const color = h('input', { type: 'color', value: '#ff7a1a', 'aria-label': 'Cor' })
  const add = async (e) => {
    e.preventDefault()
    const n = name.value.trim(); if (!n) return
    await put('subjects', { id: uid(), name: n, color: color.value, archived: false, createdAt: Date.now() })
  }
  const row = (s) => {
    const label = h('span', { style: 'flex:1;min-width:6rem' }, s.name + (s.archived ? ' (arquivada)' : ''))
    const goal = h('input', { type: 'number', min: 0, max: 10080, value: s.weeklyGoalMin ?? '', placeholder: 'min', style: 'width:5rem', 'aria-label': `Meta semanal em minutos de ${s.name}`,
      onchange: (e) => put('subjects', { ...s, weeklyGoalMin: Math.min(10080, Math.max(0, Math.round(Number(e.target.value) || 0))) || undefined }) })
    const edit = btn('Editar', () => {
      const inp = h('input', { value: s.name, 'aria-label': 'Novo nome', maxlength: 80, style: 'flex:1' })
      label.replaceWith(inp); inp.focus()
      let done = false
      const save = async () => { if (done) return; done = true; const v = inp.value.trim(); if (v && v !== s.name) await put('subjects', { ...s, name: v }); else ctx.rerender() }
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') save() }); inp.addEventListener('blur', save)
    }, 'link')
    return h('li', { class: 'card row', style: s.archived ? 'opacity:.6' : '' },
      h('span', { style: `width:1rem;height:1rem;border-radius:50%;background:${s.color};flex:none`, 'aria-hidden': 'true' }), label,
      h('label', { class: 'row muted small' }, 'Meta/sem', goal), edit, btn(s.archived ? 'Reativar' : 'Arquivar', () => put('subjects', { ...s, archived: !s.archived }), 'link'))
  }
  return h('div', { class: 'stack narrow' }, h('h1', null, 'Matérias'),
    h('form', { class: 'row', onsubmit: add }, h('div', { style: 'flex:1;min-width:8rem' }, name), color, btn('Adicionar', null, 'primary', { type: 'submit' })),
    list.length === 0 ? h('p', { class: 'muted' }, 'Nenhuma matéria ainda. Adicione a primeira acima.') : null,
    h('ul', { class: 'plain' }, list.map(row)),
    h('p', { class: 'muted small' }, 'Arquivar não apaga o histórico. A meta semanal aparece nas Estatísticas.'))
}
