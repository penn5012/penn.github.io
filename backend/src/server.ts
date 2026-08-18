import { buildApp } from './app.js'
import { env } from './config/env.js'
import { createShutdownHandler } from './server-shutdown.js'

const app = buildApp()

const shutdown = createShutdownHandler(app, (code) => process.exit(code))
process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: env.host, port: env.port })
} catch (error) {
  app.log.error(
    { errorName: error instanceof Error ? error.name : 'UnknownError' },
    'server startup failed',
  )
  process.exit(1)
}
