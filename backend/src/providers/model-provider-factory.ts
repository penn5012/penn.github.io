import type { ModelProviderName } from '../config/env.js'
import { createDeepSeekProvider } from './deepseek.provider.js'
import { createGeminiProvider } from './gemini.provider.js'
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

const defaultModels: Record<ModelProviderName, string> = {
  openai: 'gpt-5.4-nano',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-3.5-flash-lite',
}

const approvedModels: Record<ModelProviderName, readonly string[]> = {
  openai: [defaultModels.openai],
  deepseek: [defaultModels.deepseek],
  // Keep the public selection to one reviewed Gemini model. Add a model here
  // only after its API contract, tests, and operating limits are reviewed.
  gemini: [defaultModels.gemini],
}

export function resolveModelProviderSelection(
  defaults: { provider: ModelProviderName; model: string },
  selection: ModelProviderSelection = {},
): Required<ModelProviderSelection> {
  const provider = selection.provider ?? defaults.provider
  const model =
    selection.model ??
    (selection.provider ? defaultModels[provider] : defaults.model)

  if (!approvedModels[provider].includes(model)) {
    throw new AppError(
      400,
      'MODEL_SELECTION_UNSUPPORTED',
      'The selected provider and model combination is not supported.',
    )
  }

  return { provider, model }
}

export function createModelProvider(options: {
  provider: ModelProviderName
  model: string
  openAiApiKey: string | undefined
  deepSeekApiKey: string | undefined
  geminiApiKey?: string | undefined
  timeoutMs: number
}): ModelProvider {
  const shared = { model: options.model, timeoutMs: options.timeoutMs }
  if (options.provider === 'deepseek') {
    return createDeepSeekProvider({
      ...shared,
      apiKey: options.deepSeekApiKey,
    })
  }
  if (options.provider === 'gemini') {
    return createGeminiProvider({
      model: options.model,
      apiKey: options.geminiApiKey,
      timeoutMs: options.timeoutMs,
    })
  }
  return createOpenAiProvider({ ...shared, apiKey: options.openAiApiKey })
}

export function createModelProviderFactory(options: {
  provider: ModelProviderName
  model: string
  openAiApiKey: string | undefined
  deepSeekApiKey: string | undefined
  geminiApiKey?: string | undefined
  timeoutMs: number
}): ModelProviderFactory {
  return (selection = {}) => {
    const { provider, model } = resolveModelProviderSelection(
      options,
      selection,
    )
    return createModelProvider({
      provider,
      model,
      openAiApiKey: options.openAiApiKey,
      deepSeekApiKey: options.deepSeekApiKey,
      geminiApiKey: options.geminiApiKey,
      timeoutMs: options.timeoutMs,
    })
  }
}
