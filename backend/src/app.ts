import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { conversationRoute } from './modules/conversations/conversation.route.js'
import { demoRoute } from './modules/demo/demo.route.js'
import { healthRoute } from './modules/health/health.route.js'
import { createOpenAiProvider } from './providers/openai.provider.js'
import type { ModelProvider } from './providers/model-provider.js'
import { registerErrorHandler } from './shared/http/error-handler.js'

export function buildApp(options: { modelProvider?: ModelProvider } = {}) {
  const app = Fastify({ logger: true })
  const modelProvider =
    options.modelProvider ??
    createOpenAiProvider({
      apiKey: env.openAiApiKey,
      model: env.openAiModel,
      timeoutMs: env.openAiTimeoutMs,
    })
  registerErrorHandler(app)
  void app.register(cors, { origin: env.corsOrigin })
  void app.register(healthRoute)
  void app.register(demoRoute)
  void app.register((instance) => conversationRoute(instance, modelProvider))
  return app
}
