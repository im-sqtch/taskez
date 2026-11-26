import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasUnreadComments } from '../src/store/commentReadStore.ts'

const task = {
  id: 'task-1',
  comments: [
    { id: 'comment-1', authorId: 'user-1', text: 'Primeiro', createdAt: '2026-09-26T12:00:00.000Z' },
    // Relógio do outro dispositivo está atrasado: a posição ainda define que é novo.
    { id: 'comment-2', authorId: 'user-2', text: 'Novo', createdAt: '2026-09-26T11:59:00.000Z' },
  ],
}

const ownAuthors = new Set(['user-1'])

test('detecta comentário posterior pelo ID e pela ordem, sem depender do horário', () => {
  assert.equal(hasUnreadComments(task, 'user-1', {
    lastReadAt: { 'user-1:task-1': task.comments[0].createdAt },
    lastReadCommentId: { 'user-1:task-1': 'comment-1' },
  }, ownAuthors), true)
})

test('não mostra indicador quando o último comentário já foi lido', () => {
  assert.equal(hasUnreadComments(task, 'user-1', {
    lastReadAt: { 'user-1:task-1': task.comments[1].createdAt },
    lastReadCommentId: { 'user-1:task-1': 'comment-2' },
  }, ownAuthors), false)
})

test('mantém compatibilidade com o registro antigo baseado em horário', () => {
  assert.equal(hasUnreadComments(task, 'user-1', {
    lastReadAt: { 'user-1:task-1': task.comments[0].createdAt },
    lastReadCommentId: {},
  }, ownAuthors), true)
})

test('não marca como novos os comentários do próprio usuário', () => {
  const ownOnly = {
    id: 'task-2',
    comments: [
      { id: 'comment-3', authorId: 'user-1', text: 'Meu', createdAt: '2026-09-26T12:00:00.000Z' },
      // Comentário feito como membro da equipe vinculado ao próprio usuário.
      { id: 'comment-4', authorId: 'member-1', text: 'Meu também', createdAt: '2026-09-26T12:01:00.000Z' },
    ],
  }
  assert.equal(hasUnreadComments(ownOnly, 'user-1', {
    lastReadAt: {},
    lastReadCommentId: {},
  }, new Set(['user-1', 'member-1'])), false)
})
