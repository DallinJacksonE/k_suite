import { DEFAULT_BLOG_COLLECTION_TAG, type AdminApiService, type AdminRefundOrderInput, type AdminUserAccount, type AdminUserUpdateInput, type ApiEndpointDoc, type BlogArticleInput, type BlogArticleRecord, type BlogBlock, type BlogCollectionInput, type BlogCollectionRecord, type CreateProductInput, type MarketEventInput, type MarketEventRecord, type OrderRecord, type PatternProductInput, type ProductColorVariation, type ProductPhotoUploadResult, type ProductRecord, type ProductSize, type ProductType, type ServiceHealthReport, type UpdateProductInput } from '../service/AdminApiService'

export interface ProductFormInput { type: ProductType; title: string; price: string; salePrice?: string; isSaleItem: boolean; description: string; thumbnailImage: string; available: boolean; readyToShip: boolean; sizes: ProductSize[]; tags: string; inventoryCount?: string; colorVariations: ProductColorVariation[]; pdfKey: string }
export interface LoginFormInput { email: string; password: string }
export interface UploadFormInput { category: 'product' | 'blog'; file: File | null }
export interface PatternPdfFormInput { file: File | null }
export interface DeleteObjectInput { category: 'product' | 'blog'; objectKey: string }
export interface UploadedAsset { label: string; key: string; url?: string }

export interface AdminDashboardView {
  setBusy(isBusy: boolean): void
  setStatus(message: string): void
  setError(message: string | null): void
  setAdminName(name: string | null): void
  setAuthenticated(isAuthenticated: boolean): void
  setBackendStatus(status: string): void
  setApiEndpoints(endpoints: ApiEndpointDoc[]): void
  setOrders(orders: OrderRecord[]): void
  setUsers(users: AdminUserAccount[]): void
  setProducts(products: ProductRecord[]): void
  setBlogArticles(articles: BlogArticleRecord[]): void
  setBlogCollections(collections: BlogCollectionRecord[]): void
  setMarketEvents(events: MarketEventRecord[]): void
  setServiceHealth(health: ServiceHealthReport): void
  addCreatedProduct(product: ProductRecord): void
  addUploadedAsset(asset: UploadedAsset): void
}

export class AdminDashboardPresenter {
  private readonly service: AdminApiService
  private view: AdminDashboardView | null = null

  constructor(service: AdminApiService) { this.service = service }
  attach(view: AdminDashboardView): void { this.view = view; this.view.setAuthenticated(false); void this.refreshBackendSummary() }
  detach(): void { this.view = null }

  async refreshBackendSummary(): Promise<void> {
    await this.run('Backend summary loaded.', async () => {
      const [health, docs] = await Promise.all([this.service.checkHealth(), this.service.loadApiDocs()])
      this.view?.setBackendStatus(`${health.status} at ${health.timestamp}`)
      this.view?.setApiEndpoints(docs.endpoints)
    })
  }

  async login(input: LoginFormInput): Promise<void> {
    await this.run('Admin session started.', async () => {
      const result = await this.service.login({ email: requireText(input.email, 'email'), password: requireText(input.password, 'password') })
      this.view?.setAdminName(result.admin.name)
      this.view?.setAuthenticated(true)
      await Promise.all([this.loadOrders(), this.loadUsers(), this.loadProducts(), this.loadBlogCollections(), this.loadBlogArticles(), this.loadMarketEvents(), this.loadServiceHealth()])
    })
  }

  logout(): void { this.view?.setAdminName(null); this.view?.setAuthenticated(false); this.view?.setStatus('Signed out locally. Backend logout endpoint is not implemented yet.') }
  async loadOrders(): Promise<void> { await this.run('Orders loaded.', async () => this.view?.setOrders(await this.service.listOrders())) }
  async markOrderShipped(orderId: string): Promise<void> { await this.run('Order marked shipped.', async () => { const updated = await this.service.markOrderShipped(requireText(orderId, 'order id')); this.view?.setOrders([updated, ...(await this.service.listOrders()).filter((order) => order.orderId !== updated.orderId)]) }) }
  async loadUsers(): Promise<void> { await this.run('Users loaded.', async () => this.view?.setUsers(await this.service.listUsers())) }
  async updateUser(email: string, input: AdminUserUpdateInput): Promise<void> { await this.run('User updated.', async () => { await this.service.updateUser(requireText(email, 'user email'), normalizeAdminUserPatch(input)); await this.loadUsers() }) }
  async deleteUser(email: string): Promise<void> { await this.run('User deleted.', async () => { await this.service.deleteUser(requireText(email, 'user email')); await this.loadUsers() }) }
  async refundOrder(orderId: string, input: AdminRefundOrderInput): Promise<void> { await this.run('Refund issued.', async () => { await this.service.refundOrder(requireText(orderId, 'order id'), normalizeRefund(input)); await Promise.all([this.loadOrders(), this.loadUsers()]) }) }
  async loadProducts(): Promise<void> { await this.run('Products loaded.', async () => this.view?.setProducts(await this.service.listProducts())) }
  async loadBlogCollections(): Promise<void> { await this.run('Blog collections loaded.', async () => this.view?.setBlogCollections(await this.service.listBlogCollections())) }
  async loadBlogArticles(): Promise<void> { await this.run('Blog articles loaded.', async () => this.view?.setBlogArticles(await this.service.listBlogArticles())) }
  async loadMarketEvents(): Promise<void> { await this.run('Market dates loaded.', async () => this.view?.setMarketEvents(await this.service.listMarketEvents())) }
  async loadServiceHealth(): Promise<void> { await this.run('Service health loaded.', async () => this.view?.setServiceHealth(await this.service.loadServiceHealth())) }

  async createProduct(input: ProductFormInput): Promise<boolean> { return this.run('Product created.', async () => this.view?.addCreatedProduct(await this.service.createProduct(toProductInput(input)))) }
  async updateProduct(productId: string, input: UpdateProductInput): Promise<void> { await this.run('Product updated.', async () => this.view?.addCreatedProduct(await this.service.updateProduct(requireText(productId, 'product id'), input))) }
  async deleteProduct(productId: string): Promise<void> { await this.run('Product deleted.', async () => { await this.service.deleteProduct(requireText(productId, 'product id')); await this.loadProducts() }) }
  async uploadProductImage(file: File | null): Promise<string> { const result = await this.uploadPhoto({ category: 'product', file }); return result.publicUrl }
  async uploadBlogImage(file: File | null): Promise<string> { const result = await this.uploadPhoto({ category: 'blog', file }); return result.publicUrl }
  async uploadPhoto(input: UploadFormInput): Promise<ProductPhotoUploadResult> {
    let uploaded!: ProductPhotoUploadResult
    await this.run('Image uploaded.', async () => { uploaded = await this.service.uploadPhoto(input.category, requireFile(input.file, 'image file')); this.view?.addUploadedAsset(toPhotoAsset(uploaded)) })
    return uploaded
  }
  async uploadPatternPdf(input: PatternPdfFormInput): Promise<string> {
    let key = ''
    await this.run('Pattern PDF uploaded.', async () => { const result = await this.service.uploadPatternPdf(requireFile(input.file, 'pattern PDF')); key = result.key; this.view?.addUploadedAsset({ label: 'Pattern PDF', key: result.key }) })
    return key
  }
  async deletePhoto(input: DeleteObjectInput): Promise<void> { await this.run('Image deleted.', async () => this.service.deletePhoto(input.category, requireText(input.objectKey, 'object key'))) }
  async deletePatternPdf(objectKey: string): Promise<void> { await this.run('Pattern PDF deleted.', async () => this.service.deletePatternPdf(requireText(objectKey, 'object key'))) }
  async createBlogArticle(input: BlogArticleInput): Promise<boolean> { return this.run('Blog article created.', async () => { this.view?.setBlogArticles([await this.service.createBlogArticle(normalizeBlogArticle(input))]); await this.loadBlogArticles() }) }
  async updateBlogArticle(articleId: string, input: Partial<BlogArticleInput>): Promise<void> { await this.run('Blog article updated.', async () => { await this.service.updateBlogArticle(requireText(articleId, 'article id'), input); await this.loadBlogArticles() }) }
  async deleteBlogArticle(articleId: string): Promise<void> { await this.run('Blog article deleted.', async () => { await this.service.deleteBlogArticle(requireText(articleId, 'article id')); await this.loadBlogArticles() }) }
  async createBlogCollection(input: BlogCollectionInput): Promise<boolean> { return this.run('Blog collection created.', async () => { await this.service.createBlogCollection(normalizeBlogCollection(input)); await this.loadBlogCollections() }) }
  async updateBlogCollection(tag: string, input: Partial<BlogCollectionInput>): Promise<void> { await this.run('Blog collection updated.', async () => { await this.service.updateBlogCollection(requireText(tag, 'collection tag'), normalizeBlogCollectionPatch(input)); await Promise.all([this.loadBlogCollections(), this.loadBlogArticles()]) }) }
  async deleteBlogCollection(tag: string): Promise<void> { await this.run('Blog collection deleted.', async () => { const normalizedTag = requireText(tag, 'collection tag'); if (normalizedTag === DEFAULT_BLOG_COLLECTION_TAG) throw new Error('Default blog collection cannot be deleted.'); await this.service.deleteBlogCollection(normalizedTag); await Promise.all([this.loadBlogCollections(), this.loadBlogArticles()]) }) }
  async createMarketEvent(input: MarketEventInput): Promise<boolean> { return this.run('Market date created.', async () => { await this.service.createMarketEvent(normalizeMarketEvent(input)); await this.loadMarketEvents() }) }
  async updateMarketEvent(eventId: string, input: Partial<MarketEventInput>): Promise<void> { await this.run('Market date updated.', async () => { await this.service.updateMarketEvent(requireText(eventId, 'market event id'), normalizeMarketEventPatch(input)); await this.loadMarketEvents() }) }
  async deleteMarketEvent(eventId: string): Promise<void> { await this.run('Market date deleted.', async () => { await this.service.deleteMarketEvent(requireText(eventId, 'market event id')); await this.loadMarketEvents() }) }

  private async run(successMessage: string, action: () => Promise<void>): Promise<boolean> {
    this.view?.setBusy(true); this.view?.setError(null)
    try { await action(); this.view?.setStatus(successMessage); return true } catch (error) { this.view?.setError(error instanceof Error ? error.message : 'Unexpected admin action failure.'); return false } finally { this.view?.setBusy(false) }
  }
}

function toProductInput(input: ProductFormInput): CreateProductInput {
  const base = {
    type: input.type,
    title: requireText(input.title, 'title'),
    price: parsePositiveNumber(input.price, 'price'),
    salePrice: parseOptionalPositiveNumber(input.salePrice, 'sale price'),
    isSaleItem: input.isSaleItem,
    description: requireText(input.description, 'description'),
    thumbnailImage: requireText(input.thumbnailImage, 'thumbnail image'),
    available: input.available,
    tags: parseTags(input.tags),
  }
  if (input.type === 'plushie') return { ...base, type: 'plushie', readyToShip: input.readyToShip, sizes: input.sizes, inventoryCount: parseOptionalNonNegativeInteger(input.inventoryCount, 'inventory count'), colorVariations: normalizeColorVariations(input.colorVariations) }
  const patternInput: PatternProductInput = { ...base, type: 'pattern', pdfKey: requireText(input.pdfKey, 'PDF key') }
  return patternInput
}
function normalizeBlogArticle(input: BlogArticleInput): BlogArticleInput { return { ...input, title: requireText(input.title, 'title'), slug: requireText(input.slug, 'slug'), excerpt: requireText(input.excerpt, 'excerpt'), blocks: input.blocks.map(normalizeBlogBlock), collectionTags: normalizeCollectionTags(input.collectionTags) } }
function normalizeAdminUserPatch(input: AdminUserUpdateInput): AdminUserUpdateInput { return { ...input, name: input.name === undefined ? undefined : requireText(input.name, 'name'), password: input.password === undefined || !input.password.trim() ? undefined : input.password } }
function normalizeRefund(input: AdminRefundOrderInput): AdminRefundOrderInput { return { amount: input.amount, reason: optionalText(input.reason) } }
function normalizeBlogCollection(input: BlogCollectionInput): BlogCollectionInput { return { tag: optionalText(input.tag), label: requireText(input.label, 'collection label'), description: optionalText(input.description) } }
function normalizeBlogCollectionPatch(input: Partial<BlogCollectionInput>): Partial<BlogCollectionInput> { return { tag: input.tag === undefined ? undefined : optionalText(input.tag), label: input.label === undefined ? undefined : requireText(input.label, 'collection label'), description: input.description === undefined ? undefined : optionalText(input.description) } }
function normalizeCollectionTags(values: string[] | undefined): string[] { const tags = [...new Set((values ?? []).map((tag) => tag.trim()).filter(Boolean))]; return tags.length ? tags : [DEFAULT_BLOG_COLLECTION_TAG] }
function normalizeBlogBlock(block: BlogBlock): BlogBlock { if (block.type === 'youtube') return { ...block, videoId: normalizeYoutubeVideoId(block.videoId) }; return block }
function normalizeMarketEvent(input: MarketEventInput): MarketEventInput { return { ...input, title: requireText(input.title, 'title'), location: requireText(input.location, 'location'), address: optionalText(input.address), startsAt: requireDate(input.startsAt, 'date and time') } }
function normalizeMarketEventPatch(input: Partial<MarketEventInput>): Partial<MarketEventInput> { return { ...input, title: input.title === undefined ? undefined : requireText(input.title, 'title'), location: input.location === undefined ? undefined : requireText(input.location, 'location'), address: input.address === undefined ? undefined : optionalText(input.address), startsAt: input.startsAt === undefined ? undefined : requireDate(input.startsAt, 'date and time') } }
export function normalizeYoutubeVideoId(value: string): string { const trimmed = requireText(value, 'YouTube video'); const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/); return match?.[1] ?? trimmed }
function toPhotoAsset(result: ProductPhotoUploadResult): UploadedAsset { return { label: 'Public image', key: result.key, url: result.publicUrl } }
function requireText(value: string, label: string): string { const trimmed = value.trim(); if (!trimmed) throw new Error(`${label} is required.`); return trimmed }
function optionalText(value: string | undefined): string | undefined { const trimmed = value?.trim(); return trimmed ? trimmed : undefined }
function requireDate(value: string, label: string): string { const trimmed = requireText(value, label); if (Number.isNaN(new Date(trimmed).getTime())) throw new Error(`${label} must be a valid date.`); return trimmed }
function requireFile(file: File | null, label: string): File { if (!file) throw new Error(`${label} is required.`); return file }
function parsePositiveNumber(value: string, label: string): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`); return parsed }
function parseOptionalPositiveNumber(value: string | undefined, label: string): number | undefined { if (!value?.trim()) return undefined; return parsePositiveNumber(value, label) }
function parseOptionalNonNegativeInteger(value: string | undefined, label: string): number | undefined { if (!value?.trim()) return undefined; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer.`); return parsed }
function parseTags(value: string): string[] | undefined { const tags = value.split(',').map((tag) => tag.trim()).filter(Boolean); return tags.length ? tags : undefined }
function normalizeColorVariations(variations: ProductColorVariation[]): ProductColorVariation[] { return variations.map((variation) => { const imageUrl = variation.imageUrl?.trim(); return imageUrl ? { name: requireText(variation.name, 'color name'), imageUrl } : { name: requireText(variation.name, 'color name') } }) }
