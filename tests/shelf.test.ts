import { describe, expect, it } from 'vitest'
import { groupBooks, moveBefore } from '../src/features/library/shelfCore'
import { fitSize } from '../src/features/library/coverUtil'

const b = (id: string, extra: object = {}) => ({ id, title: id, status: 'want', createdAt: Number(id.replace(/\D/g, '')) || 0, ...extra })
describe('estante', () => {
  it('agrupa por autor sem diferenciar maiúsculas e põe "Sem autor" por último', () => {
    const g = groupBooks([b('a1', { author: 'Tolkien' }), b('a2', { author: 'tolkien ' }), b('a3'), b('a4', { author: 'Asimov' })], 'author', [])
    expect(g.map((x) => [x.label, x.books.length])).toEqual([['Asimov', 1], ['Tolkien', 2], ['Sem autor', 1]])
  })
  it('estantes personalizadas: mantém a ordem criada e sempre mostra "Sem estante"', () => {
    const g = groupBooks([b('a1', { shelf: 'Favoritos' }), b('a2')], 'shelf', ['Fantasia', 'Favoritos'])
    expect(g.map((x) => [x.label, x.books.length])).toEqual([['Fantasia', 0], ['Favoritos', 1], ['Sem estante', 1]])
  })
  it('ordena por posição escolhida antes da data de criação', () => {
    const g = groupBooks([b('a1', { shelfOrder: 2 }), b('a2', { shelfOrder: 0 }), b('a3')], 'series', [])
    expect(g[0].books.map((x) => x.id)).toEqual(['a2', 'a1', 'a3'])
  })
  it('agrupa por estado na ordem de leitura', () => {
    const g = groupBooks([b('a1', { status: 'done' }), b('a2', { status: 'reading' })], 'status', [])
    expect(g.map((x) => x.key)).toEqual(['reading', 'done'])
  })
  it('moveBefore reordena sem perder nem duplicar ids', () => {
    expect(moveBefore(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
    expect(moveBefore(['a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'a'])
    expect(moveBefore(['a', 'b'], 'x', 'a')).toEqual(['x', 'a', 'b'])
    expect(moveBefore(['a', 'b'], 'a', 'a')).toEqual(['a', 'b'])
  })
  it('reduz a capa mantendo a proporção e nunca amplia', () => {
    expect(fitSize(1800, 1200, 360)).toEqual({ w: 360, h: 240 })
    expect(fitSize(100, 150, 360)).toEqual({ w: 100, h: 150 })
  })
})
