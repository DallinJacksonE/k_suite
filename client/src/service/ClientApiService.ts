import type {
  ClientProfileResponse,
  ClientSessionState,
  CartItemInput,
  CartResponse,
  CartSnapshot,
  CheckoutEstimateRequest,
  CheckoutEstimateResponse,
  CsrfTokenResponse,
  LoginInput,
  MarketEventSummary,
  Product,
  PublicUser,
  RegisterInput,
  ShopProductBatchRequest,
  ShopProductBatchResponse,
  ShopProductListResponse,
  UpdateCartItemInput,
} from './ClientTypes'

export interface HealthResponse {
  status: string
  timestamp: string
}

export interface ClientApiService {
  checkHealth(): Promise<HealthResponse>
  getSession(): Promise<ClientSessionState>
  login(input: LoginInput): Promise<ClientSessionState>
  register(input: RegisterInput): Promise<ClientSessionState>
  logout(): Promise<void>
  loadProfile(): Promise<ClientProfileResponse>
  listFeaturedProducts(): Promise<Product[]>
  getNextMarketEvent(): Promise<MarketEventSummary | null>
  listShopProducts(request: ShopProductBatchRequest): Promise<ShopProductBatchResponse>
  addCartItem(input: CartItemInput): Promise<CartResponse>
  getCart(): Promise<CartSnapshot>
  updateCartItem(itemId: string, input: UpdateCartItemInput): Promise<CartSnapshot>
  estimateCheckout(input: CheckoutEstimateRequest): Promise<CheckoutEstimateResponse>
}

export class FetchClientApiService implements ClientApiService {
  private readonly basePath: string
  private readonly fetcher: typeof fetch

  constructor(basePath = '/api', fetcher: typeof fetch = fetch) {
    this.basePath = basePath
    this.fetcher = fetcher
  }

  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health')
  }

  async getSession(): Promise<ClientSessionState> {
    return this.request<ClientSessionState>('/user/session')
  }

  async login(input: LoginInput): Promise<ClientSessionState> {
    return toSessionState(await this.mutatingRequest<unknown>('/user/login', input))
  }

  async register(input: RegisterInput): Promise<ClientSessionState> {
    return toSessionState(await this.mutatingRequest<unknown>('/user/auth', input))
  }

  async logout(): Promise<void> {
    await this.request<void>('/user/logout', { method: 'POST' })
  }

  async loadProfile(): Promise<ClientProfileResponse> {
    return this.request<ClientProfileResponse>('/user/profile')
  }

  async listFeaturedProducts(): Promise<Product[]> {
    const response = await this.request<ShopProductListResponse>('/shop/plushies?batchSize=3')
    return response.products
  }

  async getNextMarketEvent(): Promise<MarketEventSummary | null> {
    return {
      id: 'temporary-next-market',
      title: 'Upcoming handmade market',
      startsAt: 'TBD',
      locationName: 'Market calendar coming soon',
      source: 'temporary-placeholder',
    }
  }

  async listShopProducts(request: ShopProductBatchRequest): Promise<ShopProductBatchResponse> {
    return this.request<ShopProductBatchResponse>(`/shop/products?${toShopQuery(request)}`)
  }

  async addCartItem(input: CartItemInput): Promise<CartResponse> {
    const productType = input.productType ?? 'plushie'
    return this.mutatingRequest<CartResponse>(productType === 'pattern' ? '/shop/patterns' : '/shop/plushies', input)
  }

  async getCart(): Promise<CartSnapshot> {
    return this.request<CartSnapshot>('/shop/cart')
  }

  async updateCartItem(itemId: string, input: UpdateCartItemInput): Promise<CartSnapshot> {
    const csrf = await this.request<CsrfTokenResponse>('/user/csrf')
    return this.request<CartSnapshot>(`/shop/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', [csrf.headerName]: csrf.token },
      body: JSON.stringify(input),
    })
  }

  async estimateCheckout(input: CheckoutEstimateRequest): Promise<CheckoutEstimateResponse> {
    return this.request<CheckoutEstimateResponse>('/shop/checkout/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  }

  private async mutatingRequest<T>(path: string, body: unknown): Promise<T> {
    const csrf = await this.request<CsrfTokenResponse>('/user/csrf')
    return this.request<T>(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify(body),
    })
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.basePath}${path}`, {
      ...init,
      credentials: 'include',
      headers: init.headers,
    })

    if (response.status === 204) return undefined as T

    const body = await parseResponseBody(response)
    if (!response.ok) throw new Error(readErrorMessage(body, response.status))

    return body as T
  }
}

function toShopQuery(request: ShopProductBatchRequest): string {
  const params = new URLSearchParams()
  const filters = request.filters ?? {}
  if (filters.type) params.set('type', filters.type)
  if (filters.saleOnly !== undefined) params.set('saleOnly', String(filters.saleOnly))
  if (filters.color) params.set('color', filters.color)
  if (filters.size) params.set('size', filters.size)
  if (request.batchSize !== undefined) params.set('batchSize', String(request.batchSize))
  if (request.afterId) params.set('afterId', request.afterId)
  if (request.sort) params.set('sort', request.sort)
  if (request.direction) params.set('direction', request.direction)
  return params.toString()
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined

  return (response.headers.get('content-type') ?? '').includes('application/json')
    ? JSON.parse(text)
    : text
}

function toSessionState(body: unknown): ClientSessionState {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (record.status === 'guest') return { status: 'guest' }
    if (record.status === 'authenticated' && record.user) return { status: 'authenticated', user: record.user as PublicUser }
    if (record.user) return { status: 'authenticated', user: record.user as PublicUser }
  }

  throw new Error('Invalid session response.')
}

function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }

  return typeof body === 'string' && body ? body : `Request failed with status ${status}`
}
