import { randomUUID } from 'node:crypto'
import type { Conversation } from './conversation.types.js'

const conversations = new Map<string, Conversation>()

export function listConversations(): Conversation[] {
  return [...conversations.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function createConversation(title: string): Conversation {
  const now = new Date().toISOString()
  const conversation: Conversation = { id: randomUUID(), title, createdAt: now, updatedAt: now }
  conversations.set(conversation.id, conversation)
  return conversation
}
