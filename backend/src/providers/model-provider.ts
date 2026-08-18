export type ModelMessage = {
  role: 'user' | 'assistant'
  content: string
}

export interface ModelProvider {
  generateReply(messages: readonly ModelMessage[]): Promise<string>
}

export class ModelProviderUnavailableError extends Error {
  readonly code = 'MODEL_PROVIDER_UNAVAILABLE'

  constructor() {
    super('模型服务暂时不可用')
    this.name = 'ModelProviderUnavailableError'
  }
}

export class ModelProviderResponseError extends Error {
  readonly code = 'MODEL_PROVIDER_ERROR'

  constructor() {
    super('模型服务返回了无效响应')
    this.name = 'ModelProviderResponseError'
  }
}
