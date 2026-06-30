export type ProductType = 'plushie' | 'pattern'
export type ProductSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large'
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'shipped' | 'cancelled'
export type BlogBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'youtube'; videoId: string; title?: string }

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
export interface BlogArticleInput { title: string; slug: string; excerpt: string; blocks: BlogBlock[]; published?: boolean }
export interface BlogArticleRecord extends BlogArticleInput { articleId: string; published: boolean; createdAt?: string; updatedAt?: string }
export interface ServiceHealthCheck { name: string; status: 'ok' | 'error'; message?: string }
export interface ServiceHealthReport { status: 'ok' | 'degraded'; checkedAt: string; services: ServiceHealthCheck[] }

export interface AdminApiService {
  checkHealth(): Promise<HealthResponse>
  loadApiDocs(): Promise<ApiDocsResponse>
  login(credentials: AdminCredentials): Promise<AdminLoginResult>
  listOrders(): Promise<OrderRecord[]>
  markOrderShipped(orderId: string): Promise<OrderRecord>
  listProducts(): Promise<ProductRecord[]>
  createProduct(input: CreateProductInput): Promise<ProductRecord>
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord>
  deleteProduct(productId: string): Promise<void>
  uploadPhoto(category: 'product' | 'blog', file: File): Promise<ProductPhotoUploadResult>
  deletePhoto(category: 'product' | 'blog', objectKey: string): Promise<void>
  uploadPatternPdf(file: File): Promise<PatternPdfUploadResult>
  deletePatternPdf(objectKey: string): Promise<void>
  listBlogArticles(): Promise<BlogArticleRecord[]>
  createBlogArticle(input: BlogArticleInput): Promise<BlogArticleRecord>
  updateBlogArticle(articleId: string, input: Partial<BlogArticleInput>): Promise<BlogArticleRecord>
  deleteBlogArticle(articleId: string): Promise<void>
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
  async listProducts(): Promise<ProductRecord[]> { return (await this.request<{ products: ProductRecord[] }>('/admin/products')).products }
  async createProduct(input: CreateProductInput): Promise<ProductRecord> { return (await this.request<{ product: ProductRecord }>('/admin/products', jsonInit('POST', input))).product }
  async updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord> { return (await this.request<{ product: ProductRecord }>(`/admin/products/${encodeURIComponent(productId)}`, jsonInit('PATCH', input))).product }
  async deleteProduct(productId: string): Promise<void> { await this.request<void>(`/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }) }
  async uploadPhoto(category: 'product' | 'blog', file: File): Promise<ProductPhotoUploadResult> { const body = new FormData(); body.set('file', file); return this.request<ProductPhotoUploadResult>(`/admin/photos/${category}`, { method: 'POST', body }) }
  async deletePhoto(category: 'product' | 'blog', objectKey: string): Promise<void> { await this.request<void>(`/admin/photos/${category}/${encodeObjectKey(objectKey)}`, { method: 'DELETE' }) }
  async uploadPatternPdf(file: File): Promise<PatternPdfUploadResult> { const body = new FormData(); body.set('file', file); return this.request<PatternPdfUploadResult>('/admin/pdfs/patterns', { method: 'POST', body }) }
  async deletePatternPdf(objectKey: string): Promise<void> { await this.request<void>(`/admin/pdfs/patterns/${encodeObjectKey(objectKey)}`, { method: 'DELETE' }) }
  async listBlogArticles(): Promise<BlogArticleRecord[]> { return (await this.request<{ articles: BlogArticleRecord[] }>('/admin/blog/articles')).articles }
  async createBlogArticle(input: BlogArticleInput): Promise<BlogArticleRecord> { return (await this.request<{ article: BlogArticleRecord }>('/admin/blog/articles', jsonInit('POST', input))).article }
  async updateBlogArticle(articleId: string, input: Partial<BlogArticleInput>): Promise<BlogArticleRecord> { return (await this.request<{ article: BlogArticleRecord }>(`/admin/blog/articles/${encodeURIComponent(articleId)}`, jsonInit('PATCH', input))).article }
  async deleteBlogArticle(articleId: string): Promise<void> { await this.request<void>(`/admin/blog/articles/${encodeURIComponent(articleId)}`, { method: 'DELETE' }) }
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
