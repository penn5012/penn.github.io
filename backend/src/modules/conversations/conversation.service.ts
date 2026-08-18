import { randomUUID } from 'node:crypto'
import type {
  ModelMessage,
  ModelProvider,
} from '../../providers/model-provider.js'
import { AppError } from '../../shared/http/app-error.js'
import type { Conversation } from './conversation.types.js'
import type {
  CreateConversationMessageResponse,
  Message,
} from './conversation.types.js'

const conversations = new Map<string, Conversation>()
const messages = new Map<string, Message[]>()

export function listConversations(): Conversation[] {
  return [...conversations.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function createConversation(title: string): Conversation {
  const now = new Date().toISOString()
  const conversation: Conversation = {
    id: randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
  }
  conversations.set(conversation.id, conversation)
  messages.set(conversation.id, [])
  return conversation
}

export async function createConversationMessage(
  conversationId: string,
  content: string,
  provider: ModelProvider,
): Promise<CreateConversationMessageResponse> {
  const conversation = conversations.get(conversationId)
  if (!conversation) {
    throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
  }

  const conversationMessages = messages.get(conversationId) ?? []
  // Keep complete user/assistant turns: nine prior pairs plus the current
  // user message keeps the provider input bounded without splitting a turn.
  const context: ModelMessage[] = conversationMessages
    .slice(-18)
    .map(({ role, content }) => ({ role, content }))
  context.push({ role: 'user', content })

  // Generate first. The two messages and the conversation timestamp are only
  // mutated after the provider has returned a valid reply.
  const assistantContent = await provider.generateReply(context)
  if (!assistantContent.trim()) {
    throw new AppError(
      502,
      'MODEL_PROVIDER_ERROR',
      'The assistant could not generate a response.',
    )
  }
  const now = new Date().toISOString()
  const userMessage: Message = {
    id: randomUUID(),
    conversationId,
    role: 'user',
    content,
    createdAt: now,
  }
  const assistantMessage: Message = {
    id: randomUUID(),
    conversationId,
    role: 'assistant',
    content: assistantContent,
    createdAt: now,
  }

  messages.set(conversationId, [
    ...conversationMessages,
    userMessage,
    assistantMessage,
  ])
  conversation.updatedAt = now

  return { userMessage, assistantMessage }
}

export function listMessages(conversationId: string): Message[] {
  return [...(messages.get(conversationId) ?? [])]
}
