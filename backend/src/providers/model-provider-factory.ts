import type { ModelProviderName } from '../config/env.js'
import { createDeepSeekProvider } from './deepseek.provider.js'
import type { ModelProvider } from './model-provider.js'
import { createOpenAiProvider } from './openai.provider.js'
import { AppError } from '../shared/http/app-error.js'

export type ModelProviderSelection = {
  provider?: ModelProviderName
  model?: string
}

export type ModelProviderFactory = (
  selection?: ModelProviderSelection,
) => ModelProvider

const approvedModels: Record<ModelProviderName, readonly string[]> = {
  openai: ['gpt-5.4-nano'],
  deepseek: ['deepseek-chat'],
}

export function createModelProvider(options: {
  provider: ModelProviderName
  model: string
  openAiApiKey: string | undefined
  deepSeekApiKey: string | undefined
  timeoutMs: number
}): ModelProvider {
  const shared = { model: options.model, timeoutMs: options.timeoutMs }
  if (options.provider === 'deepseek') {
    return createDeepSeekProvider({
      ...shared,
      apiKey: options.deepSeekApiKey,
    })
  }
  return createOpenAiProvider({ ...shared, apiKey: options.openAiApiKey })
}

export function createModelProviderFactory(options: {
  provider: ModelProviderName
  model: string
  openAiApiKey: string | undefined
  deepSeekApiKey: string | undefined
  timeoutMs: number
}): ModelProviderFactory {
  return (selection = {}) => {
    const provider = selection.provider ?? options.provider
    const model = selection.model ?? options.model
    if (!approvedModels[provider].includes(model)) {
      throw new AppError(
        400,
        'MODEL_SELECTION_UNSUPPORTED',
        'The selected provider and model combination is not supported.',
      )
    }
    return createModelProvider({
      provider,
      model,
      openAiApiKey: options.openAiApiKey,
      deepSeekApiKey: options.deepSeekApiKey,
      timeoutMs: options.timeoutMs,
    })
  }
}
