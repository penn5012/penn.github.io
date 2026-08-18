import type {
  Conversation,
  CreateConversationMessageResponse,
  DemoResponse,
} from '../types/api'
import { request } from './request'

export const apiClient = {
  demo: (code: string) =>
    request<DemoResponse>('/api/demo', {
      params: { code },
    }),
  listConversations: () => request<Conversation[]>('/api/conversations'),
  createConversation: (title: string) =>
    request<Conversation>('/api/conversations', {
      method: 'POST',
      data: { title },
    }),
  sendMessage: (conversationId: string, content: string) =>
    request<CreateConversationMessageResponse>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        data: { content },
      },
    ),
}
