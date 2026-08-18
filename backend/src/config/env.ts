import 'dotenv/config'

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT 必须是 1 到 65535 之间的整数')
  }
  return port
}

function parseTimeout(value: string | undefined): number {
  const timeout = Number(value ?? 30_000)
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 120_000) {
    throw new Error('MODEL_TIMEOUT_MS 必须是 1000 到 120000 之间的整数')
  }
  return timeout
}

export type ModelProviderName = 'openai' | 'deepseek'

function parseModelProvider(value: string | undefined): ModelProviderName {
  const provider = value ?? 'openai'
  if (provider !== 'openai' && provider !== 'deepseek') {
    throw new Error('MODEL_PROVIDER 只支持 openai 或 deepseek')
  }
  return provider
}

const modelProvider = parseModelProvider(
  process.env.MODEL_PROVIDER ?? process.env.AI_PROVIDER,
)

export const env = {
  host: process.env.HOST ?? '127.0.0.1',
  port: parsePort(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  modelProvider,
  model:
    process.env.MODEL ??
    (modelProvider === 'deepseek'
      ? (process.env.DEEPSEEK_MODEL ?? 'deepseek-chat')
      : (process.env.OPENAI_MODEL ?? 'gpt-5.4-nano')),
  openAiApiKey: process.env.OPENAI_API_KEY,
  deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
  modelTimeoutMs: parseTimeout(
    process.env.MODEL_TIMEOUT_MS ?? process.env.OPENAI_TIMEOUT_MS,
  ),
}
