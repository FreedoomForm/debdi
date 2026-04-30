/**
 * Small shared API client used across dashboard modules.
 * It keeps all request and response error handling in one place.
 */

export type ApiResult<T = unknown> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
      details?: string
      status?: number
    }

type FetchApiOptions<TBody = unknown> = {
  method?: string
  body?: TBody
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Defaults to 'include' so authenticated POS routes work out of the box. */
  credentials?: RequestCredentials
  /** Defaults to 'no-store' for GETs so polling sees fresh data. */
  cache?: RequestCache
}

type ErrorPayload = {
  error?: string
  message?: string
  details?: string
}

const DEFAULT_NETWORK_ERROR = 'Network error while contacting the server'
const DEFAULT_REQUEST_ERROR = 'Request failed'

function extractErrorPayload(payload: unknown): ErrorPayload | null {
  if (!payload || typeof payload !== 'object') return null
  return payload as ErrorPayload
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }
  return response.text().catch(() => null)
}

export async function fetchApi<T = unknown, TBody = unknown>(
  url: string,
  options?: FetchApiOptions<TBody>
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers = {}, signal, credentials = 'include', cache } = options ?? {}

  const canSendBody = method !== 'GET' && method !== 'HEAD'
  const requestHeaders: Record<string, string> = { ...headers }
  if (canSendBody && body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const effectiveCache: RequestCache | undefined =
    cache ?? (method === 'GET' ? 'no-store' : undefined)

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      signal,
      credentials,
      ...(effectiveCache ? { cache: effectiveCache } : {}),
      ...(canSendBody && body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    const payload = await parseResponsePayload(response)
    if (response.ok) {
      return { ok: true, data: payload as T }
    }

    const parsedError = extractErrorPayload(payload)
    return {
      ok: false,
      error:
        parsedError?.error ||
        parsedError?.message ||
        `${DEFAULT_REQUEST_ERROR} (${response.status})`,
      details: parsedError?.details,
      status: response.status,
    }
  } catch {
    return { ok: false, error: DEFAULT_NETWORK_ERROR }
  }
}
