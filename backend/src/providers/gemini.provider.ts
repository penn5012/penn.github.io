import { GoogleGenAI, type Interactions } from '@google/genai'
import type { ModelMessage, ModelProvider } from './model-provider.js'
import {
  ModelProviderResponseError,
  ModelProviderUnavailableError,
} from './model-provider.js'

/** The injected test double only needs to reproduce the SDK interactions API. */
export type GeminiClient = Pick<GoogleGenAI, 'interactions'>

/**
 * AChat owns and bounds conversation history, so the Interactions API receives
 * a stateless timeline instead of storing another copy at Google. The latest
 * API represents user and assistant turns as typed execution steps.
 */
function toInteractionInput(
  messages: readonly ModelMessage[],
): Interactions.Step[] {
  return messages.map<Interactions.Step>(({ role, content }) => ({
    type: role === 'assistant' ? 'model_output' : 'user_input',
    content: [{ type: 'text', text: content }],
  }))
}

function mapGeminiError(error: unknown): never {
  if (error instanceof ModelProviderResponseError) {
    throw error
  }

  // SDK errors may contain request IDs, upstream payloads or authentication
  // details. Convert them before they can reach application logs or clients.
  throw new ModelProviderUnavailableError()
}

export function createGeminiProvider(options: {
  apiKey: string | undefined
  model: string
  timeoutMs: number
  client?: GeminiClient
}): ModelProvider {
  if (!options.apiKey) {
    return {
      async generateReply() {
        // Do not reveal which environment variable is missing to API clients.
        throw new ModelProviderUnavailableError()
      },
      async streamReply() {
        throw new ModelProviderUnavailableError()
      },
    }
  }

  const client = options.client ?? new GoogleGenAI({ apiKey: options.apiKey })

  return {
    async generateReply(messages: readonly ModelMessage[]) {
      try {
        const interaction = await client.interactions.create(
          {
            model: options.model,
            input: toInteractionInput(messages),
            // The application is the source of truth for history and persistence.
            store: false,
          },
          { timeout: options.timeoutMs },
        )
        const output = interaction.output_text?.trim() ?? ''

        if (!output) {
          throw new ModelProviderResponseError()
        }

        return output
      } catch (error) {
        return mapGeminiError(error)
      }
    },

    async streamReply(messages: readonly ModelMessage[], signal?: AbortSignal) {
      try {
        const stream = await client.interactions.create(
          {
            model: options.model,
            input: toInteractionInput(messages),
            store: false,
            stream: true,
          },
          {
            timeout: options.timeoutMs,
            // Aborting fetch releases the local SDK/network resources. Google
            // notes that cancellation may not stop already-started billable work.
            fetchOptions: signal ? { signal } : undefined,
          },
        )

        return (async function* textDeltas() {
          let completed = false
          let receivedText = false

          try {
            for await (const event of stream) {
              if (event.event_type === 'error') {
                throw new ModelProviderUnavailableError()
              }

              if (
                event.event_type === 'step.delta' &&
                event.delta.type === 'text' &&
                event.delta.text
              ) {
                receivedText = true
                yield event.delta.text
              }

              if (event.event_type === 'interaction.completed') {
                completed = event.interaction.status === 'completed'
              }
            }

            if (!completed || !receivedText) {
              throw new ModelProviderResponseError()
            }
          } catch (error) {
            return mapGeminiError(error)
          }
        })()
      } catch (error) {
        return mapGeminiError(error)
      }
    },
  }
}
