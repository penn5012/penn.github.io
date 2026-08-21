import type { FastifyInstance, FastifyReply } from 'fastify'
import { AppError } from '../../shared/http/app-error.js'
import type { ModelProviderFactory } from '../../providers/model-provider-factory.js'
import { ModelProviderResponseError } from '../../providers/model-provider.js'
import {
  createConversationMessage,
  createConversation,
  listConversations,
  prepareConversationMessage,
  type PreparedConversationMessage,
} from './conversation.service.js'
import type { CreateConversationBody } from './conversation.types.js'

type ConversationParams = { conversationId: string }
type CreateConversationMessageBody = {
  content: string
  provider?: 'openai' | 'deepseek' | 'gemini'
  model?: 'gpt-5.4-nano' | 'deepseek-chat' | 'gemini-3.5-flash-lite'
}

function toMessageAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }
  if (error instanceof ModelProviderResponseError) {
    return new AppError(
      502,
      'MODEL_PROVIDER_ERROR',
      'The assistant could not generate a response.',
    )
  }
  return new AppError(
    503,
    'MODEL_PROVIDER_UNAVAILABLE',
    'The assistant is temporarily unavailable. Please try again later.',
    30,
  )
}

function writeSse(reply: FastifyReply, event: string, data: unknown): boolean {
  // JSON.stringify escapes embedded newlines, keeping every SSE data payload
  // on one protocol line and preventing generated text from forging an event.
  return reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

async function waitForDrain(reply: FastifyReply): Promise<void> {
  await new Promise<void>((resolve) => {
    const done = () => {
      reply.raw.off('drain', done)
      reply.raw.off('close', done)
      resolve()
    }
    reply.raw.once('drain', done)
    reply.raw.once('close', done)
  })
}

export async function conversationRoute(
  app: FastifyInstance,
  providerFactory: ModelProviderFactory,
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
            content: { type: 'string', minLength: 1 },
            provider: {
              type: 'string',
              enum: ['openai', 'deepseek', 'gemini'],
            },
            model: {
              type: 'string',
              enum: ['gpt-5.4-nano', 'deepseek-chat', 'gemini-3.5-flash-lite'],
            },
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
        const provider = providerFactory({
          provider: request.body.provider,
          model: request.body.model,
        })
        const result = await createConversationMessage(
          request.params.conversationId,
          content,
          provider,
        )
        return reply.code(201).send(result)
      } catch (error) {
        throw toMessageAppError(error)
      }
    },
  )

  app.post<{
    Params: ConversationParams
    Body: CreateConversationMessageBody
  }>(
    '/api/conversations/:conversationId/messages/stream',
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
            content: { type: 'string', minLength: 1 },
            provider: {
              type: 'string',
              enum: ['openai', 'deepseek', 'gemini'],
            },
            model: {
              type: 'string',
              enum: ['gpt-5.4-nano', 'deepseek-chat', 'gemini-3.5-flash-lite'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const content = request.body.content.trim()
      if (!content) {
        throw new AppError(400, 'INVALID_REQUEST', 'Request validation failed.')
      }

      const abortController = new AbortController()
      let prepared: PreparedConversationMessage | undefined
      let assistantContent = ''
      let streamSettled = false
      const pauseAndAbort = () => {
        // Save before aborting upstream. This guarantees that a follow-up sent
        // immediately after Stop sees the interrupted topic in its context.
        if (!streamSettled && prepared) {
          prepared.pause(assistantContent)
          streamSettled = true
        }
        abortController.abort()
      }
      request.raw.once('aborted', pauseAndAbort)
      reply.raw.once('close', pauseAndAbort)

      try {
        prepared = prepareConversationMessage(
          request.params.conversationId,
          content,
        )
        const provider = providerFactory({
          provider: request.body.provider,
          model: request.body.model,
        })
        if (!provider.streamReply) {
          throw new AppError(
            400,
            'MODEL_STREAMING_UNSUPPORTED',
            'The selected model provider does not support streaming.',
          )
        }

        // Await upstream stream creation before sending HTTP 200. Configuration,
        // authentication and connection failures can still use the normal JSON
        // error envelope and an accurate status code at this point.
        const deltas = await provider.streamReply(
          prepared.context,
          abortController.signal,
        )

        reply.hijack()
        reply.raw.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        })
        // Send the SSE headers immediately so the client can stop a slow model
        // even before its first text delta arrives.
        reply.raw.flushHeaders()

        for await (const delta of deltas) {
          if (abortController.signal.aborted) return reply
          if (!delta) continue

          assistantContent += delta
          if (!writeSse(reply, 'assistant.delta', { delta })) {
            // Respect Node's writable backpressure instead of buffering an
            // unbounded model response in process memory.
            await waitForDrain(reply)
          }
        }

        if (abortController.signal.aborted) return reply

        const result = prepared.complete(assistantContent)
        streamSettled = true
        writeSse(reply, 'message.completed', result)
        reply.raw.end()
        return reply
      } catch (error) {
        // A client cancellation is already persisted by pauseAndAbort. The
        // connection is gone, so there is no error event left to deliver.
        if (abortController.signal.aborted) return reply

        // Provider/configuration failures are not paused conversations. Mark
        // the stream settled before sending/throwing the error so the later
        // socket close cannot accidentally persist failed partial output.
        streamSettled = true
        const appError = toMessageAppError(error)
        if (!reply.raw.headersSent) {
          throw appError
        }

        if (!abortController.signal.aborted && !reply.raw.destroyed) {
          request.log.warn(
            { errorCode: appError.code, statusCode: appError.statusCode },
            'stream generation failed',
          )
          writeSse(reply, 'error', {
            error: { code: appError.code, message: appError.message },
          })
          reply.raw.end()
        }
        return reply
      } finally {
        request.raw.off('aborted', pauseAndAbort)
        reply.raw.off('close', pauseAndAbort)
      }
    },
  )
}
