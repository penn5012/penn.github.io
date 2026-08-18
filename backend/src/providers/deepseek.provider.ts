import OpenAI from 'openai'
import type { ModelMessage, ModelProvider } from './model-provider.js'
import {
  ModelProviderResponseError,
  ModelProviderUnavailableError,
} from './model-provider.js'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

export function createDeepSeekProvider(options: {
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
    baseURL: DEEPSEEK_BASE_URL,
    timeout: options.timeoutMs,
  })

  return {
    async generateReply(messages: readonly ModelMessage[]) {
      try {
        const response = await client.chat.completions.create({
          model: options.model,
          messages: messages.map(({ role, content }) => ({ role, content })),
        })
        const output =
          typeof response.choices[0]?.message.content === 'string'
            ? response.choices[0].message.content.trim()
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
