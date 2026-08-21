import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { conversationRoute } from './modules/conversations/conversation.route.js'
import { demoRoute } from './modules/demo/demo.route.js'
import { healthRoute } from './modules/health/health.route.js'
import {
  createModelProviderFactory,
  type ModelProviderFactory,
} from './providers/model-provider-factory.js'
import type { ModelProvider } from './providers/model-provider.js'
import { registerErrorHandler } from './shared/http/error-handler.js'

export function buildApp(
  options: {
    modelProvider?: ModelProvider
    modelProviderFactory?: ModelProviderFactory
  } = {},
) {
  const app = Fastify({ logger: true })
  const modelProviderFactory =
    options.modelProviderFactory ??
    (options.modelProvider
      ? () => options.modelProvider as ModelProvider
      : createModelProviderFactory({
          provider: env.modelProvider,
          model: env.model,
          openAiApiKey: env.openAiApiKey,
          deepSeekApiKey: env.deepSeekApiKey,
          geminiApiKey: env.geminiApiKey,
          timeoutMs: env.modelTimeoutMs,
        }))
  registerErrorHandler(app)
  void app.register(cors, { origin: env.corsOrigin })
  void app.register(healthRoute)
  void app.register(demoRoute)
  void app.register((instance) =>
    conversationRoute(instance, modelProviderFactory),
  )
  return app
}
