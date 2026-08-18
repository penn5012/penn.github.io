export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type MessageRole = 'user' | 'assistant'

export type Message = {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  createdAt: string
}

export type CreateConversationMessageResponse = {
  userMessage: Message
  assistantMessage: Message
}

export type CreateConversationBody = {
  title: string
}
