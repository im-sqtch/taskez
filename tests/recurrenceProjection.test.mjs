import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectRecurringTasks } from '../src/lib/recurrenceProjection.ts'

const base = { workspaceId: 'w', status: 'todo', priority: 'medium', assigneeIds: [], subtasks: [], comments: [], links: [], order: 0, updatedAt: '2026-11-02T12:00:00.000Z' }
// Hoje: quinta, 26/11/2026 (meio-dia local).
const today = new Date(2026, 10, 26, 12)
const keys = (list) => list.map((t) => t.dueDate.slice(0, 10)).sort()

test('tarefa semanal aparece nas próximas semanas, até hoje + 60 dias (inclusive)', () => {
  // Criada na segunda 02/11 com prazo no mesmo dia, repete toda segunda.
  const task = { ...base, id: 't1', title: 'Reunião', dueDate: '2026-11-02T00:00:00.000Z', dueTime: '09:30', createdAt: '2026-11-02T12:00:00.000Z', recurrence: { frequency: 'weekly', weekdays: [1] } }
  const result = projectRecurringTasks([task], [], today)
  assert.deepEqual(keys(result), ['2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25'])
  assert.ok(result.every((t) => t.occurrenceOf === 't1' && t.dueTime === '09:30' && t.status === 'todo'))
})

test('respeita a data de término da regra', () => {
  const task = { ...base, id: 't2', title: 'Diária', dueDate: '2026-11-26T00:00:00.000Z', createdAt: '2026-11-26T12:00:00.000Z', recurrence: { frequency: 'daily', endDate: '2026-11-29T00:00:00.000Z' } }
  assert.deepEqual(keys(projectRecurringTasks([task], [], today)), ['2026-11-27', '2026-11-28', '2026-11-29'])
})

test('tarefas de projeto recorrente mantêm o deslocamento do prazo', () => {
  // Projeto mensal (dia 1) criado em 01/11; tarefa vence 2 dias depois da criação.
  const project = { id: 'p1', workspaceId: 'w', name: 'Mensal', color: '#7c5cff', status: 'active', memberIds: [], links: [], createdAt: '2026-11-01T12:00:00.000Z', order: 0, completionAck: false, recurrence: { frequency: 'monthly', dayOfMonth: 1 } }
  const task = { ...base, id: 't3', title: 'Fechar mês', projectId: 'p1', dueDate: '2026-11-03T00:00:00.000Z', createdAt: '2026-11-01T12:00:00.000Z' }
  assert.deepEqual(keys(projectRecurringTasks([task], [project], today)), ['2026-12-03', '2027-01-03'])
})

test('tarefa sem prazo ou sem recorrência não gera nada', () => {
  const noDue = { ...base, id: 't4', title: 'Sem prazo', createdAt: '2026-11-02T12:00:00.000Z', recurrence: { frequency: 'daily' } }
  const plain = { ...base, id: 't5', title: 'Normal', dueDate: '2026-11-27T00:00:00.000Z', createdAt: '2026-11-02T12:00:00.000Z' }
  assert.equal(projectRecurringTasks([noDue, plain], [], today).length, 0)
})
