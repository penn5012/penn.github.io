import type { FastifyInstance } from 'fastify'

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok' as const,
    service: 'ai-chat-backend',
    timestamp: new Date().toISOString(),
  }))
}
