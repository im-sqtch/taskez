import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cellText, convertColumn, formatNumber, moveItem, nextCheckbox, parseDateText, parseNumber } from '../src/lib/taskTables.ts'

const lookup = { members: [{ id: 'm1', name: 'Ana Souza' }, { id: 'm2', name: 'Bruno' }], files: [{ id: 'f1', name: 'contrato.pdf' }] }

test('lê números no padrão brasileiro e no americano', () => {
  assert.equal(parseNumber('1.234,56'), '1234.56')
  assert.equal(parseNumber('1234.56'), '1234.56')
  assert.equal(parseNumber('R$ 10'), '10')
  assert.equal(parseNumber('US$ 2,5'), '2.5')
  assert.equal(parseNumber('1.234'), '1234')
  assert.equal(parseNumber('1,234.56'), '1234.56')
  assert.equal(parseNumber('-3'), '-3')
  assert.equal(parseNumber('abc'), null)
})

test('formata número, dólar e real', () => {
  assert.equal(formatNumber('number', '1234.5'), '1.234,5')
  assert.equal(formatNumber('brl', '1234.5'), 'R$ 1.234,50')
  assert.equal(formatNumber('usd', '1234.5'), 'US$ 1,234.50')
})

test('lê datas ISO e dd/mm/aaaa e rejeita datas inválidas', () => {
  assert.equal(parseDateText('2026-11-27'), '2026-11-27')
  assert.equal(parseDateText('27/11/2026'), '2026-11-27')
  assert.equal(parseDateText('5/3/26'), '2026-03-05')
  assert.equal(parseDateText('31/02/2026'), null)
  assert.equal(parseDateText('amanhã'), null)
})

test('texto copiado de cada tipo', () => {
  const select = { id: 'c', title: 'Status', type: 'multiSelect', options: [{ id: 'o1', name: 'Feito', color: '#000' }, { id: 'o2', name: 'Urgente', color: '#000' }] }
  assert.equal(cellText(select, ['o1', 'o2'], lookup), 'Feito, Urgente')
  assert.equal(cellText({ id: 'c', title: 'P', type: 'person' }, ['m2', 'm1'], lookup), 'Bruno, Ana Souza')
  assert.equal(cellText({ id: 'c', title: 'A', type: 'files' }, ['f1', 'sumiu'], lookup), 'contrato.pdf')
  assert.equal(cellText({ id: 'c', title: 'D', type: 'date' }, '2026-11-27', lookup), '27/11/2026')
  assert.equal(cellText({ id: 'c', title: 'V', type: 'brl' }, '10', lookup), 'R$ 10,00')
  assert.equal(cellText({ id: 'c', title: 'C', type: 'checkbox' }, 'failed', lookup), 'Não cumprido')
  assert.equal(cellText({ id: 'c', title: 'T' }, 'texto antigo', lookup), 'texto antigo', 'coluna sem tipo é texto')
})

function tableWith(type, values, options) {
  return {
    id: 't',
    columns: [{ id: 'c', title: 'Coluna', type, options }],
    rows: values.map((value, i) => ({ id: `r${i}`, cells: { c: value } })),
  }
}

test('converte texto em número e conta o que se perde', () => {
  const { table, lost } = convertColumn(tableWith('text', ['12', '1.234,5', 'abc', '']), 'c', 'brl', lookup)
  assert.deepEqual(table.rows.map((row) => row.cells.c), ['12', '1234.5', '', ''])
  assert.equal(table.columns[0].type, 'brl')
  assert.equal(lost, 1)
})

test('converte texto em select e multi-select criando opções sem repetir', () => {
  const single = convertColumn(tableWith('text', ['Feito', 'feito', 'Pendente']), 'c', 'select', lookup).table
  assert.equal(single.columns[0].options.length, 2)
  assert.equal(single.rows[0].cells.c, single.rows[1].cells.c)
  const multi = convertColumn(tableWith('text', ['a, b', 'b']), 'c', 'multiSelect', lookup).table
  assert.equal(multi.columns[0].options.map((option) => option.name).join('|'), 'a|b')
  assert.equal(multi.rows[0].cells.c.length, 2)
})

test('select e multi-select mantêm as opções entre si', () => {
  const options = [{ id: 'o1', name: 'A', color: '#000' }, { id: 'o2', name: 'B', color: '#000' }]
  const toSingle = convertColumn(tableWith('multiSelect', [['o1', 'o2'], ['o2']], options), 'c', 'select', lookup)
  assert.deepEqual(toSingle.table.rows.map((row) => row.cells.c), ['o1', 'o2'])
  assert.equal(toSingle.lost, 1, 'a célula com duas opções perde uma')
  const back = convertColumn(toSingle.table, 'c', 'multiSelect', lookup).table
  assert.deepEqual(back.rows.map((row) => row.cells.c), [['o1'], ['o2']])
})

test('converte nomes em pessoas e pessoas em texto', () => {
  const people = convertColumn(tableWith('text', ['ana souza, Bruno', 'Carlos']), 'c', 'person', lookup)
  assert.deepEqual(people.table.rows.map((row) => row.cells.c), [['m1', 'm2'], []])
  assert.equal(people.lost, 1)
  const text = convertColumn(people.table, 'c', 'text', lookup).table
  assert.equal(text.rows[0].cells.c, 'Ana Souza, Bruno')
  assert.equal(text.columns[0].options, undefined)
})

test('converte texto em data e em checkbox', () => {
  assert.deepEqual(convertColumn(tableWith('text', ['27/11/2026', 'ontem']), 'c', 'date', lookup).table.rows.map((row) => row.cells.c), ['2026-11-27', ''])
  assert.deepEqual(convertColumn(tableWith('text', ['Concluído', 'não cumprido', 'x']), 'c', 'checkbox', lookup).table.rows.map((row) => row.cells.c), ['done', 'failed', ''])
})

test('move itens e alterna o checkbox', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c'])
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c'])
  assert.equal(nextCheckbox(''), 'done')
  assert.equal(nextCheckbox('done'), 'failed')
  assert.equal(nextCheckbox('failed'), '')
})
