// Montagem do DOM sem innerHTML: todo texto entra como nó de texto (sem risco de injeção de HTML).
export function h(tag, props, ...kids) {
  const el = document.createElement(tag)
  let value
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else if (k === 'value') value = v
    else if (k === 'checked' || k === 'disabled' || k === 'open') el[k] = true
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(String(c))) }
  kids.forEach(add)
  if (value !== undefined) el.value = value
  return el
}
export const btn = (label, onclick, cls = '', attrs = {}) => h('button', { type: 'button', class: `btn ${cls}`.trim(), onclick, ...attrs }, label)
export const field = (label, input, cls = '') => h('label', { class: `field ${cls}`.trim() }, h('span', { class: 'muted small' }, label), input)
export const select = (options, value, attrs = {}) => h('select', { value, ...attrs }, options.map(([v, l]) => h('option', { value: v }, l)))
export const muted = (t) => h('p', { class: 'muted' }, t)
export const card = (...kids) => h('section', { class: 'card' }, ...kids)
export const askConfirm = (t) => window.confirm(t)
export const fmtDate = (t) => new Date(t).toLocaleDateString('pt-BR')
export const fmtDateTime = (t) => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { timeStyle: 'short' })

export function downloadText(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function progress(pct, label, color) {
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label }, h('div', { style: `width:${Math.min(100, Math.max(0, pct))}%${color ? ';background:' + color : ''}` }))
}
/** Gráfico de barras verticais em CSS. items: [{label, value, title}] */
export function bars(items, { color = 'var(--ember)', height = 140 } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return h('div', { class: 'bars', style: `height:${height}px`, role: 'img', 'aria-label': 'Gráfico de barras' },
    items.map((i) => h('div', { class: 'bar-col', title: i.title ?? `${i.label}: ${i.value}` },
      h('div', { class: 'bar', style: `height:${(i.value / max) * 100}%;background:${color}` }), h('span', { class: 'bar-l' }, i.label))))
}
/** Barras horizontais. items: [{label, value, color, text}] */
export function hbars(items) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return h('ul', { class: 'hbars' }, items.map((i) => h('li', null, h('div', { class: 'row between' }, h('span', null, i.label), h('span', { class: 'muted num' }, i.text ?? i.value)),
    h('div', { class: 'progress' }, h('div', { style: `width:${(i.value / max) * 100}%;background:${i.color || 'var(--ember)'}` })))))
}
