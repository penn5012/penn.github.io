import { env } from '../config/env'
import type { Conversation, HealthResponse } from '../types/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    throw new Error(`请求失败（${response.status}）`)
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  health: () => request<HealthResponse>('/health'),
  listConversations: () => request<Conversation[]>('/api/conversations'),
  createConversation: (title: string) =>
    request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
}
