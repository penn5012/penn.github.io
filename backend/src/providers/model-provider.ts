export type ModelMessage = {
  role: 'user' | 'assistant'
  content: string
}

export interface ModelProvider {
  generateReply(messages: readonly ModelMessage[]): Promise<string>

  /**
   * Starts an incremental reply when the vendor supports upstream streaming.
   * Resolving the promise means the upstream stream was created successfully;
   * failures after that point are reported while consuming the iterable.
   */
  streamReply?(
    messages: readonly ModelMessage[],
    signal?: AbortSignal,
  ): Promise<AsyncIterable<string>>
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
