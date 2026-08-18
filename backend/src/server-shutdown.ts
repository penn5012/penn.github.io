export type ShutdownServer = {
  close: () => Promise<unknown>
  log: { error: (data: unknown, message?: string) => void }
}

export function createShutdownHandler(
  server: ShutdownServer,
  exit: (code: number) => void,
) {
  let shutdownPromise: Promise<void> | undefined

  return async (signal: string): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise
    }

    shutdownPromise = server
      .close()
      .then(() => exit(0))
      .catch((error: unknown) => {
        server.log.error(
          {
            signal,
            errorName: error instanceof Error ? error.name : 'UnknownError',
          },
          'server shutdown failed',
        )
        exit(1)
      })

    return shutdownPromise
  }
}
