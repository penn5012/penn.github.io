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

export type PreparedConversationMessage = {
  context: readonly ModelMessage[]
  complete(assistantContent: string): CreateConversationMessageResponse
  pause(partialAssistantContent: string): void
}

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
  const prepared = prepareConversationMessage(conversationId, content)
  const assistantContent = await provider.generateReply(prepared.context)
  return prepared.complete(assistantContent)
}

/**
 * Validates the conversation and captures one immutable generation context.
 * Streaming routes call `complete` after a successful response or `pause` when
 * the user stops generation. Provider failures call neither method, so failed
 * partial output does not become conversation history.
 */
export function prepareConversationMessage(
  conversationId: string,
  content: string,
): PreparedConversationMessage {
  const conversation = conversations.get(conversationId)
  if (!conversation) {
    throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.')
  }

  const conversationMessages = messages.get(conversationId) ?? []
  // Keep the most recent bounded history. A stopped request may leave a user
  // message without an assistant reply, so a trailing user is valid. If the
  // slice starts midway through an older pair, drop that orphan assistant.
  const boundedHistory = conversationMessages.slice(-18)
  if (boundedHistory[0]?.role === 'assistant') boundedHistory.shift()

  const context: ModelMessage[] = boundedHistory.map(({ role, content }) => ({
    role,
    content,
  }))
  context.push({ role: 'user', content })

  let settled = false

  const savePausedMessages = (partialAssistantContent: string) => {
    const now = new Date().toISOString()
    const pausedMessages: Message[] = [
      {
        id: randomUUID(),
        conversationId,
        role: 'user',
        content,
        createdAt: now,
      },
    ]

    // When the user stops before the first token arrives, the user message is
    // still valuable context. Only add an assistant message when some visible
    // text was actually generated.
    if (partialAssistantContent.trim()) {
      pausedMessages.push({
        id: randomUUID(),
        conversationId,
        role: 'assistant',
        content: partialAssistantContent,
        createdAt: now,
      })
    }

    messages.set(conversationId, [...conversationMessages, ...pausedMessages])
    conversation.updatedAt = now
  }

  return {
    context,
    complete(assistantContent) {
      if (settled || !assistantContent.trim()) {
        throw new AppError(
          502,
          'MODEL_PROVIDER_ERROR',
          'The assistant could not generate a response.',
        )
      }
      settled = true

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
    },
    pause(partialAssistantContent) {
      // Socket close and request abort can fire for the same cancellation.
      // Settling once prevents the paused turn from being stored twice.
      if (settled) return
      settled = true
      savePausedMessages(partialAssistantContent)
    },
  }
}

export function listMessages(conversationId: string): Message[] {
  return [...(messages.get(conversationId) ?? [])]
}
