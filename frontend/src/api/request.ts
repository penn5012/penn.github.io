import { env } from '../config/env'
import { ApiError, normalizeRequestError, rejectErrorResponse } from './errors'

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestParams = Record<
  string,
  string | number | boolean | null | undefined
>

export type RequestConfig = Omit<RequestInit, 'body' | 'headers' | 'method'> & {
  method?: RequestMethod
  params?: RequestParams
  data?: unknown | FormData
  headers?: HeadersInit
}

export type ServerSentEvent = {
  event: string
  data: string
}

type DynamicResponse = Awaited<ReturnType<Response['json']>>

function buildUrl(path: string, params?: RequestParams) {
  const baseUrl = path.startsWith('http') ? '' : env.apiBaseUrl
  const url = `${baseUrl}${path}`

  if (!params) return url

  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  if (!queryString) return url

  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
}

async function parseResponse<T>(response: Response) {
  await rejectErrorResponse(response)

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

function createFetchRequest(path: string, config: RequestConfig) {
  const {
    data,
    headers: customHeaders,
    method = 'GET',
    params,
    ...init
  } = config
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  const headers = new Headers(customHeaders)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (data !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return {
    input: buildUrl(path, params),
    init: {
      ...init,
      method,
      headers,
      body:
        method === 'GET' || data === undefined
          ? undefined
          : isFormData
            ? data
            : JSON.stringify(data),
    } satisfies RequestInit,
  }
}

function parseServerSentEvent(block: string): ServerSentEvent | undefined {
  let event = 'message'
  const data: string[] = []

  block.split('\n').forEach((rawLine) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (!line || line.startsWith(':')) return

    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    const rawValue = separator === -1 ? '' : line.slice(separator + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') event = value
    if (field === 'data') data.push(value)
  })

  if (data.length === 0) return undefined
  return { event, data: data.join('\n') }
}

/**
 * 统一 HTTP 请求入口。
 * GET 参数使用 params，POST/PUT/PATCH/DELETE 请求体使用 data。
 */
export async function request<T = DynamicResponse>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  try {
    const { input, init } = createFetchRequest(path, config)
    const response = await fetch(input, init)

    return await parseResponse<T>(response)
  } catch (error) {
    throw normalizeRequestError(error)
  }
}

export async function streamRequest(
  path: string,
  config: RequestConfig,
  onEvent: (event: ServerSentEvent) => void | Promise<void>,
): Promise<void> {
  try {
    const { input, init } = createFetchRequest(path, config)
    const response = await fetch(input, init)
    await rejectErrorResponse(response)

    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      throw new ApiError('服务端没有返回有效的流式响应', {
        code: 'INVALID_STREAM_RESPONSE',
      })
    }

    if (!response.body) {
      throw new ApiError('当前浏览器无法读取流式响应', {
        code: 'STREAM_UNAVAILABLE',
      })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const event = parseServerSentEvent(block)
        if (event) await onEvent(event)
        boundary = buffer.indexOf('\n\n')
      }

      if (done) break
    }

    const finalEvent = parseServerSentEvent(buffer)
    if (finalEvent) await onEvent(finalEvent)
  } catch (error) {
    throw normalizeRequestError(error)
  }
}

export default request
