export interface HealthResponse {
  status: string
  timestamp: string
}

export interface ClientApiService {
  checkHealth(): Promise<HealthResponse>
}

export class FetchClientApiService implements ClientApiService {
  private readonly basePath: string

  constructor(basePath = '/api') {
    this.basePath = basePath
  }

  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health')
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.basePath}${path}`, {
      credentials: 'include',
      ...init,
    })

    if (response.status === 204) return undefined as T

    const body = await parseResponseBody(response)
    if (!response.ok) throw new Error(readErrorMessage(body, response.status))

    return body as T
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined

  return (response.headers.get('content-type') ?? '').includes('application/json')
    ? JSON.parse(text)
    : text
}

function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }

  return typeof body === 'string' && body ? body : `Request failed with status ${status}`
}
