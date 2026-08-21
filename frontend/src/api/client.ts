import type {
  AssistantDeltaEvent,
  Conversation,
  CreateConversationMessageRequest,
  CreateConversationMessageResponse,
  DemoResponse,
  ErrorEnvelope,
} from '../types/api'
import { ApiError } from './errors'
import { request, streamRequest } from './request'

function parseStreamData<T>(data: string): T {
  try {
    return JSON.parse(data) as T
  } catch (error) {
    throw new ApiError('服务端返回了无法解析的流式数据', {
      code: 'INVALID_STREAM_RESPONSE',
      cause: error,
    })
  }
}

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
  sendMessage: (
    conversationId: string,
    data: CreateConversationMessageRequest,
  ) =>
    request<CreateConversationMessageResponse>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        data,
      },
    ),
  streamMessage: async (
    conversationId: string,
    data: CreateConversationMessageRequest,
    options: { signal?: AbortSignal; onDelta: (delta: string) => void },
  ) => {
    let completed: CreateConversationMessageResponse | undefined

    await streamRequest(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
      {
        method: 'POST',
        data,
        headers: { Accept: 'text/event-stream' },
        signal: options.signal,
      },
      ({ event, data: eventData }) => {
        if (event === 'assistant.delta') {
          const payload = parseStreamData<AssistantDeltaEvent>(eventData)
          options.onDelta(payload.delta)
        }

        if (event === 'message.completed') {
          completed =
            parseStreamData<CreateConversationMessageResponse>(eventData)
        }

        if (event === 'error') {
          const payload = parseStreamData<ErrorEnvelope>(eventData)
          throw new ApiError(payload.error.message, {
            code: payload.error.code,
          })
        }
      },
    )

    if (!completed) {
      throw new ApiError('流式响应意外中断，请重试', {
        code: 'STREAM_INTERRUPTED',
      })
    }

    return completed
  },
}
