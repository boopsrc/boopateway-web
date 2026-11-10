/** Corpo de erro do gateway. */
export interface ErrorDto {
  error?: string
  status?: string
  remaining_attempts?: number
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly body: ErrorDto | null) {
    super(`HTTP ${status}`)
  }
}

/** Falha de rede / timeout (equivalente ao IOException do Android). */
export class NetworkError extends Error {}

export const IDEMPOTENCY_KEY = 'Idempotency-Key'
/** O reconhecimento facial no parceiro pode demorar. */
const TIMEOUT_MS = 60_000

export type FetchFn = typeof fetch

export function createHttp(baseUrl: string, fetchFn: FetchFn = (...a) => fetch(...a)) {
  return async function request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetchFn(baseUrl + path, { ...init, signal: controller.signal })
    } catch (e) {
      throw new NetworkError((e as Error)?.message ?? 'network')
    } finally {
      clearTimeout(timer)
    }
    const text = await res.text().catch(() => '')
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    if (!res.ok) throw new HttpError(res.status, (json as ErrorDto) ?? null)
    return json as T
  }
}
