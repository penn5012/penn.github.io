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
    throw new Error('OPENAI_TIMEOUT_MS 必须是 1000 到 120000 之间的整数')
  }
  return timeout
}

export const env = {
  host: process.env.HOST ?? '127.0.0.1',
  port: parsePort(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-5.4-nano',
  openAiTimeoutMs: parseTimeout(process.env.OPENAI_TIMEOUT_MS),
}
