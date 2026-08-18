// Shared response types defined by docs/api/openapi.yaml.
export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}

export type DemoResponse = {
  message: string
  timestamp: string
}

export type MessageRole = 'user' | 'assistant'

export type ModelProviderName = 'openai' | 'deepseek'

export type ModelName = 'gpt-5.4-nano' | 'deepseek-chat'

export type CreateConversationMessageRequest = {
  content: string
  provider?: ModelProviderName
  model?: ModelName
}

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

export type ErrorEnvelope = {
  error: {
    code: string
    message: string
  }
}
