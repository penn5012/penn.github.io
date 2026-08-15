import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { conversationRoute } from './modules/conversations/conversation.route.js'
import { healthRoute } from './modules/health/health.route.js'
import { registerErrorHandler } from './shared/http/error-handler.js'

export function buildApp() {
  const app = Fastify({ logger: true })
  registerErrorHandler(app)
  void app.register(cors, { origin: env.corsOrigin })
  void app.register(healthRoute)
  void app.register(conversationRoute)
  return app
}
