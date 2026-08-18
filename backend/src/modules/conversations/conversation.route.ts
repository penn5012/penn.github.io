import type { FastifyInstance } from 'fastify'
import { AppError } from '../../shared/http/app-error.js'
import type { ModelProvider } from '../../providers/model-provider.js'
import {
  ModelProviderResponseError,
  ModelProviderUnavailableError,
} from '../../providers/model-provider.js'
import {
  createConversationMessage,
  createConversation,
  listConversations,
} from './conversation.service.js'
import type { CreateConversationBody } from './conversation.types.js'

type ConversationParams = { conversationId: string }
type CreateConversationMessageBody = { content: string }

export async function conversationRoute(
  app: FastifyInstance,
  provider: ModelProvider,
) {
  app.get('/api/conversations', async () => listConversations())

  app.post<{ Body: CreateConversationBody }>(
    '/api/conversations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
      },
    },
    async (request, reply) => {
      const title = request.body.title.trim()
      if (!title) {
        throw new AppError(400, 'INVALID_REQUEST', 'Request validation failed.')
      }
      return reply.code(201).send(createConversation(title))
    },
  )

  app.post<{
    Params: ConversationParams
    Body: CreateConversationMessageBody
  }>(
    '/api/conversations/:conversationId/messages',
    {
      schema: {
        params: {
          type: 'object',
          required: ['conversationId'],
          additionalProperties: false,
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          additionalProperties: false,
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 10_000 },
          },
        },
      },
    },
    async (request, reply) => {
      const content = request.body.content.trim()
      if (!content) {
        throw new AppError(400, 'INVALID_REQUEST', 'Request validation failed.')
      }

      try {
        const result = await createConversationMessage(
          request.params.conversationId,
          content,
          provider,
        )
        return reply.code(201).send(result)
      } catch (error) {
        if (error instanceof AppError) {
          throw error
        }
        if (error instanceof ModelProviderResponseError) {
          throw new AppError(
            502,
            'MODEL_PROVIDER_ERROR',
            'The assistant could not generate a response.',
          )
        }
        if (error instanceof ModelProviderUnavailableError) {
          throw new AppError(
            503,
            'MODEL_PROVIDER_UNAVAILABLE',
            'The assistant is temporarily unavailable. Please try again later.',
            30,
          )
        }
        throw new AppError(
          503,
          'MODEL_PROVIDER_UNAVAILABLE',
          'The assistant is temporarily unavailable. Please try again later.',
          30,
        )
      }
    },
  )
}
