import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { getLastScreen, getStartupScreen, saveLastScreen } from '../src/lib/lastScreen.ts'

beforeEach(() => {
  const entries = new Map()
  globalThis.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  }
})

test('reabrir pelo endereço antigo do aplicativo restaura a última tela', () => {
  saveLastScreen('user-1', '/projects/project-1?tab=chat')
  assert.equal(getStartupScreen('user-1', '/dashboard'), '/projects/project-1?tab=chat')
  assert.equal(getStartupScreen('user-1', '/dashboard/'), '/projects/project-1?tab=chat')
  assert.equal(getStartupScreen('user-1', '/'), '/projects/project-1?tab=chat')
  assert.equal(getLastScreen('user-1'), '/projects/project-1?tab=chat')
})

test('preserva links diretos, inclusive parâmetros e fragmentos', () => {
  saveLastScreen('user-1', '/files')
  for (const path of ['/tasks/task-2', '/projects/project-2?tab=files', '/dashboard?source=notification', '/tasks/task-2#comments']) {
    assert.equal(getStartupScreen('user-1', path), path)
  }
})

test('mantém telas separadas por usuário e ignora rotas de autenticação', () => {
  saveLastScreen('user-1', '/tasks/task-1')
  saveLastScreen('user-2', '/settings')
  saveLastScreen('user-1', '/login')
  assert.equal(getLastScreen('user-1'), '/tasks/task-1')
  assert.equal(getLastScreen('user-2'), '/settings')
  assert.equal(getLastScreen('new-user'), '/dashboard')
  assert.equal(getStartupScreen(null, '/'), '/')
})

test('valores inválidos ou armazenamento bloqueado não impedem a abertura', () => {
  localStorage.setItem('taskez:last-screen:user-1', 'https://example.com')
  assert.equal(getLastScreen('user-1'), '/dashboard')
  globalThis.localStorage = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
  }
  assert.equal(getStartupScreen('user-1', '/dashboard'), '/dashboard')
  assert.doesNotThrow(() => saveLastScreen('user-1', '/files'))
})
