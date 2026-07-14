export type ProductType = 'plushie' | 'pattern'
export type ProductSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large'
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'shipped' | 'cancelled' | 'refunded'
export type BlogBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'youtube'; videoId: string; title?: string }

export const DEFAULT_BLOG_COLLECTION_TAG = 'kaylies-creations-updates'

export interface AdminCredentials { email: string; password: string }
export interface AdminIdentity { email: string; name: string }
export interface AdminLoginResult { admin: AdminIdentity; cookie: string }
export interface ProductColorVariation { name: string; imageUrl?: string }
export interface ProductBaseInput { type: ProductType; title: string; price: number; salePrice?: number; isSaleItem?: boolean; description: string; thumbnailImage: string; available: boolean; sizes?: ProductSize[]; tags?: string[]; inventoryCount?: number }
export interface PlushieProductInput extends ProductBaseInput { type: 'plushie'; readyToShip: boolean; colorVariations: ProductColorVariation[] }
export interface PatternProductInput extends ProductBaseInput { type: 'pattern'; pdfKey: string }
export type CreateProductInput = PlushieProductInput | PatternProductInput
export type UpdateProductInput = Partial<Omit<PlushieProductInput, 'type'> & Omit<PatternProductInput, 'type'>>
export interface ProductRecord extends ProductBaseInput { id: string; isSaleItem: boolean; sizes: ProductSize[]; readyToShip?: boolean; colorVariations?: ProductColorVariation[]; pdfKey?: string; createdAt?: string; updatedAt?: string }
export interface ProductPhotoUploadResult { bucket: string; key: string; publicUrl: string }
export interface PatternPdfUploadResult { bucket: string; key: string }
export interface ApiEndpointDoc { method: string; path: string; summary: string; auth: string }
export interface ApiDocsResponse { title: string; version: number; basePath: string; endpoints: ApiEndpointDoc[] }
export interface HealthResponse { status: string; timestamp: string }
export interface OrderRecord { orderId: string; productId: string; clientEmail: string; details: Record<string, unknown>; clientInstructions: string; chargedAmount: number; status: OrderStatus; createdAt?: string; updatedAt?: string }
export interface UserAddress { name: string; line1: string; line2?: string; city: string; region: string; postalCode: string; country: string }
export interface UserAddressBook { shippingAddress?: UserAddress; billingAddress?: UserAddress }
export interface AdminUserStats { orderCount: number; totalSpent: number; refundedTotal: number; purchasedPatternCount: number; cartItemCount: number }
export interface AdminUserAccount { user: { email: string; name: string; addressBook?: UserAddressBook; emailNotificationsEnabled?: boolean; createdAt?: string; updatedAt?: string }; orders: OrderRecord[]; purchasedPatterns: Array<{ productId: string; orderId: string; title: string; purchasedAt: string }>; stats: AdminUserStats }
export interface AdminUserUpdateInput { name?: string; addressBook?: UserAddressBook; emailNotificationsEnabled?: boolean; password?: string }
export interface AdminRefundOrderInput { amount?: number; reason?: string }
export interface BlogCollectionInput { tag?: string; label: string; description?: string }
export interface BlogCollectionRecord { tag: string; label: string; description?: string; createdAt?: string; updatedAt?: string }
export interface BlogArticleInput { title: string; slug: string; excerpt: string; blocks: BlogBlock[]; collectionTags?: string[]; published?: boolean }
export interface BlogArticleRecord extends BlogArticleInput { articleId: string; collectionTags: string[]; published: boolean; createdAt?: string; updatedAt?: string }
export interface MarketEventInput { title: string; location: string; address?: string; startsAt: string; endsAt?: string; description?: string; externalUrl?: string }
export interface MarketEventRecord extends MarketEventInput { id: string }
export interface ServiceHealthCheck { name: string; status: 'ok' | 'error'; message?: string }
export interface ServiceHealthReport { status: 'ok' | 'degraded'; checkedAt: string; services: ServiceHealthCheck[] }

export interface AdminApiService {
  checkHealth(): Promise<HealthResponse>
  loadApiDocs(): Promise<ApiDocsResponse>
  login(credentials: AdminCredentials): Promise<AdminLoginResult>
  listOrders(): Promise<OrderRecord[]>
  markOrderShipped(orderId: string): Promise<OrderRecord>
  listUsers(): Promise<AdminUserAccount[]>
  updateUser(email: string, input: AdminUserUpdateInput): Promise<AdminUserAccount>
  deleteUser(email: string): Promise<void>
  refundOrder(orderId: string, input: AdminRefundOrderInput): Promise<OrderRecord>
  listProducts(): Promise<ProductRecord[]>
  createProduct(input: CreateProductInput): Promise<ProductRecord>
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord>
  deleteProduct(productId: string): Promise<void>
  uploadPhoto(category: 'product' | 'blog', file: File): Promise<ProductPhotoUploadResult>
  deletePhoto(category: 'product' | 'blog', objectKey: string): Promise<void>
  uploadPatternPdf(file: File): Promise<PatternPdfUploadResult>
  deletePatternPdf(objectKey: string): Promise<void>
  listBlogArticles(): Promise<BlogArticleRecord[]>
  listBlogCollections(): Promise<BlogCollectionRecord[]>
  createBlogCollection(input: BlogCollectionInput): Promise<BlogCollectionRecord>
  updateBlogCollection(tag: string, input: Partial<BlogCollectionInput>): Promise<BlogCollectionRecord>
  deleteBlogCollection(tag: string): Promise<void>
  createBlogArticle(input: BlogArticleInput): Promise<BlogArticleRecord>
  updateBlogArticle(articleId: string, input: Partial<BlogArticleInput>): Promise<BlogArticleRecord>
  deleteBlogArticle(articleId: string): Promise<void>
  listMarketEvents(): Promise<MarketEventRecord[]>
  createMarketEvent(input: MarketEventInput): Promise<MarketEventRecord>
  updateMarketEvent(eventId: string, input: Partial<MarketEventInput>): Promise<MarketEventRecord>
  deleteMarketEvent(eventId: string): Promise<void>
  loadServiceHealth(): Promise<ServiceHealthReport>
}

export class FetchAdminApiService implements AdminApiService {
  private readonly basePath: string
  constructor(basePath = '/api') { this.basePath = basePath }
  async checkHealth(): Promise<HealthResponse> { return this.request<HealthResponse>('/health') }
  async loadApiDocs(): Promise<ApiDocsResponse> { return this.request<ApiDocsResponse>('/docs') }
  async login(credentials: AdminCredentials): Promise<AdminLoginResult> { return this.request<AdminLoginResult>('/admin/login', jsonInit('POST', credentials)) }
  async listOrders(): Promise<OrderRecord[]> { return (await this.request<{ orders: OrderRecord[] }>('/admin/orders')).orders }
  async markOrderShipped(orderId: string): Promise<OrderRecord> { return (await this.request<{ order: OrderRecord }>(`/admin/orders/${encodeURIComponent(orderId)}/status`, jsonInit('PATCH', { status: 'shipped' }))).order }
  async listUsers(): Promise<AdminUserAccount[]> { return (await this.request<{ users: AdminUserAccount[] }>('/admin/users')).users }
  async updateUser(email: string, input: AdminUserUpdateInput): Promise<AdminUserAccount> { return (await this.request<{ user: AdminUserAccount }>(`/admin/users/${encodeURIComponent(email)}`, jsonInit('PATCH', input))).user }
  async deleteUser(email: string): Promise<void> { await this.request<void>(`/admin/users/${encodeURIComponent(email)}`, { method: 'DELETE' }) }
  async refundOrder(orderId: string, input: AdminRefundOrderInput): Promise<OrderRecord> { return (await this.request<{ order: OrderRecord }>(`/admin/orders/${encodeURIComponent(orderId)}/refund`, jsonInit('POST', input))).order }
  async listProducts(): Promise<ProductRecord[]> { return (await this.request<{ products: ProductRecord[] }>('/admin/products')).products }
  async createProduct(input: CreateProductInput): Promise<ProductRecord> { return (await this.request<{ product: ProductRecord }>('/admin/products', jsonInit('POST', input))).product }
  async updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord> { return (await this.request<{ product: ProductRecord }>(`/admin/products/${encodeURIComponent(productId)}`, jsonInit('PATCH', input))).product }
  async deleteProduct(productId: string): Promise<void> { await this.request<void>(`/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }) }
  async uploadPhoto(category: 'product' | 'blog', file: File): Promise<ProductPhotoUploadResult> { const body = new FormData(); body.set('file', file); return this.request<ProductPhotoUploadResult>(`/admin/photos/${category}`, { method: 'POST', body }) }
  async deletePhoto(category: 'product' | 'blog', objectKey: string): Promise<void> { await this.request<void>(`/admin/photos/${category}/${encodeObjectKey(objectKey)}`, { method: 'DELETE' }) }
  async uploadPatternPdf(file: File): Promise<PatternPdfUploadResult> { const body = new FormData(); body.set('file', file); return this.request<PatternPdfUploadResult>('/admin/pdfs/patterns', { method: 'POST', body }) }
  async deletePatternPdf(objectKey: string): Promise<void> { await this.request<void>(`/admin/pdfs/patterns/${encodeObjectKey(objectKey)}`, { method: 'DELETE' }) }
  async listBlogArticles(): Promise<BlogArticleRecord[]> { return (await this.request<{ articles: BlogArticleRecord[] }>('/admin/blog/articles')).articles }
  async listBlogCollections(): Promise<BlogCollectionRecord[]> { return (await this.request<{ collections: BlogCollectionRecord[] }>('/admin/blog/collections')).collections }
  async createBlogCollection(input: BlogCollectionInput): Promise<BlogCollectionRecord> { return (await this.request<{ collection: BlogCollectionRecord }>('/admin/blog/collections', jsonInit('POST', input))).collection }
  async updateBlogCollection(tag: string, input: Partial<BlogCollectionInput>): Promise<BlogCollectionRecord> { return (await this.request<{ collection: BlogCollectionRecord }>(`/admin/blog/collections/${encodeURIComponent(tag)}`, jsonInit('PATCH', input))).collection }
  async deleteBlogCollection(tag: string): Promise<void> { await this.request<void>(`/admin/blog/collections/${encodeURIComponent(tag)}`, { method: 'DELETE' }) }
  async createBlogArticle(input: BlogArticleInput): Promise<BlogArticleRecord> { return (await this.request<{ article: BlogArticleRecord }>('/admin/blog/articles', jsonInit('POST', input))).article }
  async updateBlogArticle(articleId: string, input: Partial<BlogArticleInput>): Promise<BlogArticleRecord> { return (await this.request<{ article: BlogArticleRecord }>(`/admin/blog/articles/${encodeURIComponent(articleId)}`, jsonInit('PATCH', input))).article }
  async deleteBlogArticle(articleId: string): Promise<void> { await this.request<void>(`/admin/blog/articles/${encodeURIComponent(articleId)}`, { method: 'DELETE' }) }
  async listMarketEvents(): Promise<MarketEventRecord[]> { return (await this.request<{ events: MarketEventRecord[] }>('/admin/markets')).events }
  async createMarketEvent(input: MarketEventInput): Promise<MarketEventRecord> { return (await this.request<{ event: MarketEventRecord }>('/admin/markets', jsonInit('POST', input))).event }
  async updateMarketEvent(eventId: string, input: Partial<MarketEventInput>): Promise<MarketEventRecord> { return (await this.request<{ event: MarketEventRecord }>(`/admin/markets/${encodeURIComponent(eventId)}`, jsonInit('PATCH', input))).event }
  async deleteMarketEvent(eventId: string): Promise<void> { await this.request<void>(`/admin/markets/${encodeURIComponent(eventId)}`, { method: 'DELETE' }) }
  async loadServiceHealth(): Promise<ServiceHealthReport> { return (await this.request<{ health: ServiceHealthReport }>('/admin/service-health')).health }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.basePath}${path}`, { credentials: 'include', ...init })
    if (response.status === 204) return undefined as T
    const body = await parseResponseBody(response)
    if (!response.ok) throw new Error(readErrorMessage(body, response.status))
    return body as T
  }
}

function jsonInit(method: string, body: unknown): RequestInit { return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } }
async function parseResponseBody(response: Response): Promise<unknown> { const text = await response.text(); if (!text) return undefined; return (response.headers.get('content-type') ?? '').includes('application/json') ? JSON.parse(text) : text }
function readErrorMessage(body: unknown, status: number): string { if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error; return typeof body === 'string' && body ? body : `Request failed with status ${status}` }
function encodeObjectKey(objectKey: string): string { return objectKey.split('/').map((part) => encodeURIComponent(part)).join('/') }
