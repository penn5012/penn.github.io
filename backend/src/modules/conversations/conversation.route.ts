import type { FastifyInstance } from 'fastify'
import { createConversation, listConversations } from './conversation.service.js'
import type { CreateConversationBody } from './conversation.types.js'

export async function conversationRoute(app: FastifyInstance) {
  app.get('/api/conversations', async () => listConversations())

  app.post<{ Body: CreateConversationBody }>(
    '/api/conversations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: { title: { type: 'string', minLength: 1, maxLength: 120 } },
        },
      },
    },
    async (request, reply) => reply.code(201).send(createConversation(request.body.title.trim())),
  )
}
