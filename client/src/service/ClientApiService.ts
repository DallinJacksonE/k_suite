import type {
  ClientProfileResponse,
  ClientSessionState,
  BlogArticle,
  BlogArticleResponse,
  BlogCollection,
  BlogCollectionResponse,
  CartItemInput,
  CartResponse,
  CartSnapshot,
  CheckoutEstimateRequest,
  CheckoutEstimateResponse,
  CheckoutPublicConfig,
  CheckoutRequest,
  CheckoutResult,
  CsrfTokenResponse,
  LoginInput,
  MarketEventResponse,
  MarketEventSummary,
  PurchasedPatternDownload,
  PurchasedPatternsResponse,
  Product,
  PublicUser,
  RegisterInput,
  ShopProductBatchRequest,
  ShopProductBatchResponse,
  ShopProductListResponse,
  UpdateCartItemInput,
  UpdateProfileInput,
  ShopProductFilterOptions
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
  updateProfile(input: UpdateProfileInput): Promise<PublicUser>
  deleteProfile(email: string): Promise<void>
  listPurchasedPatterns(): Promise<PurchasedPatternDownload[]>
  createPurchasedPatternDownload(productId: string): Promise<PurchasedPatternDownload>
  listFeaturedProducts(): Promise<Product[]>
  getNextMarketEvent(): Promise<MarketEventSummary | null>
  listMarketEvents(): Promise<MarketEventResponse>
  listBlogArticles(): Promise<BlogArticle[]>
  listBlogCollections(): Promise<BlogCollection[]>
  listShopProducts(request: ShopProductBatchRequest): Promise<ShopProductBatchResponse>
  getShopFilterOptions(): Promise<ShopProductFilterOptions>
  addCartItem(input: CartItemInput): Promise<CartResponse>
  getCart(): Promise<CartSnapshot>
  updateCartItem(itemId: string, input: UpdateCartItemInput): Promise<CartSnapshot>
  removeCartItem(productType: CartItemInput['productType'], itemId: string): Promise<CartSnapshot>
  estimateCheckout(input: CheckoutEstimateRequest): Promise<CheckoutEstimateResponse>
  getCheckoutConfig(): Promise<CheckoutPublicConfig>
  checkout(input: CheckoutRequest): Promise<CheckoutResult>
}

export class FetchClientApiService implements ClientApiService {
  private readonly basePath: string
  private readonly fetcher: typeof fetch

  constructor(basePath = '/api', fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {
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

  async updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    return (await this.mutatingRequest<{ user: PublicUser }>('/user/profile', input)).user
  }

  async deleteProfile(email: string): Promise<void> {
    const csrf = await this.request<CsrfTokenResponse>('/user/csrf')
    await this.request<void>('/user/profile', { method: 'DELETE', headers: { 'content-type': 'application/json', [csrf.headerName]: csrf.token }, body: JSON.stringify({ email }) })
  }

  async listPurchasedPatterns(): Promise<PurchasedPatternDownload[]> {
    return (await this.request<PurchasedPatternsResponse>('/user/purchased-patterns')).patterns
  }

  async createPurchasedPatternDownload(productId: string): Promise<PurchasedPatternDownload> {
    return this.mutatingRequest<PurchasedPatternDownload>(`/user/purchased-patterns/${encodeURIComponent(productId)}/download`, {})
  }

  async listFeaturedProducts(): Promise<Product[]> {
    const response = await this.request<ShopProductListResponse>('/shop/plushies?batchSize=3')
    return response.products
  }

  async getNextMarketEvent(): Promise<MarketEventSummary | null> {
    return (await this.request<{ nextEvent: MarketEventSummary | null }>('/markets/next')).nextEvent
  }

  async listMarketEvents(): Promise<MarketEventResponse> {
    return this.request<MarketEventResponse>('/markets')
  }

  async listBlogArticles(): Promise<BlogArticle[]> {
    return (await this.request<BlogArticleResponse>('/blog/articles')).articles
  }

  async listBlogCollections(): Promise<BlogCollection[]> {
    return (await this.request<BlogCollectionResponse>('/blog/collections')).collections
  }

  async listShopProducts(request: ShopProductBatchRequest): Promise<ShopProductBatchResponse> {
    return this.request<ShopProductBatchResponse>(`/shop/products?${toShopQuery(request)}`)
  }

  async getShopFilterOptions(): Promise<ShopProductFilterOptions> {
    return this.request<ShopProductFilterOptions>('/shop/filters')
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

  async removeCartItem(productType: CartItemInput['productType'], itemId: string): Promise<CartSnapshot> {
    const csrf = await this.request<CsrfTokenResponse>('/user/csrf')
    await this.request<CartResponse>(productType === 'pattern' ? '/shop/patterns' : '/shop/plushies', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', [csrf.headerName]: csrf.token },
      body: JSON.stringify({ productId: itemId }),
    })
    return this.getCart()
  }

  async estimateCheckout(input: CheckoutEstimateRequest): Promise<CheckoutEstimateResponse> {
    return this.request<CheckoutEstimateResponse>('/shop/checkout/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  }

  async getCheckoutConfig(): Promise<CheckoutPublicConfig> {
    return this.request<CheckoutPublicConfig>('/shop/checkout/config')
  }

  async checkout(input: CheckoutRequest): Promise<CheckoutResult> {
    return this.mutatingRequest<CheckoutResult>('/shop/checkout', input)
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
      cache: init.cache ?? 'no-store',
      credentials: 'include',
      headers: withDefaultHeaders(init.headers),
    })

    if (response.status === 204) return undefined as T

    const body = await parseResponseBody(response)
    if (!response.ok) throw new Error(readErrorMessage(body, response.status))

    return body as T
  }
}

function withDefaultHeaders(headers: HeadersInit | undefined): Headers {
  const nextHeaders = new Headers(headers)
  if (!nextHeaders.has('accept')) nextHeaders.set('accept', 'application/json')
  if (!nextHeaders.has('cache-control')) nextHeaders.set('cache-control', 'no-store')
  return nextHeaders
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
