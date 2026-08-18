import OpenAI from 'openai'
import type { ModelMessage, ModelProvider } from './model-provider.js'
import {
  ModelProviderResponseError,
  ModelProviderUnavailableError,
} from './model-provider.js'

export function createOpenAiProvider(options: {
  apiKey: string | undefined
  model: string
  timeoutMs: number
}): ModelProvider {
  if (!options.apiKey) {
    return {
      async generateReply() {
        throw new ModelProviderUnavailableError()
      },
    }
  }

  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs,
  })

  return {
    async generateReply(messages: readonly ModelMessage[]) {
      try {
        const response = await client.responses.create({
          model: options.model,
          input: messages.map(({ role, content }) => ({ role, content })),
        })
        const output =
          typeof response.output_text === 'string'
            ? response.output_text.trim()
            : ''
        if (!output) {
          throw new ModelProviderResponseError()
        }
        return output
      } catch (error) {
        if (error instanceof ModelProviderResponseError) {
          throw error
        }
        throw new ModelProviderUnavailableError()
      }
    },
  }
}
