import { env } from '../config/env'
import { normalizeRequestError, rejectErrorResponse } from './errors'

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

/**
 * 统一 HTTP 请求入口。
 * GET 参数使用 params，POST/PUT/PATCH/DELETE 请求体使用 data。
 */
export async function request<T = DynamicResponse>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
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

  try {
    const response = await fetch(buildUrl(path, params), {
      ...init,
      method,
      headers,
      body:
        method === 'GET' || data === undefined
          ? undefined
          : isFormData
            ? data
            : JSON.stringify(data),
    })

    return await parseResponse<T>(response)
  } catch (error) {
    throw normalizeRequestError(error)
  }
}

export default request
