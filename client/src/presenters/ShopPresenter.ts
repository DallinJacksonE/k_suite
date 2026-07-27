import type { CartItemInput, ClientSessionState, Product, ProductSortDirection, ProductSortKey, ProductType, ShopProductBatchRequest, ShopProductFilters, ShopProductFilterOptions, ShopViewModel } from '../service/ClientTypes'

export interface ShopPresenterView {
  setShop(model: ShopViewModel): void
  setBusy(isBusy: boolean): void
  setError(message: string | null): void
}

export interface ShopService {
  listShopProducts(request: ShopProductBatchRequest): Promise<{ products: Product[]; nextCursor?: string; hasMore: boolean; appliedFilters: ShopProductFilters }>
  getShopFilterOptions(): Promise<ShopProductFilterOptions> // Add the method here
  addCartItem(input: CartItemInput): Promise<{ cart: CartItemInput[] }>
}

interface ShopPresenterOptions {
  productType?: ProductType | 'all'
}

function createInitialShop(productType: ProductType | 'all' = 'all'): ShopViewModel {
  return {
    products: [],
    filters: { type: productType },
    sort: 'createdAt',
    direction: 'desc',
    hasMore: false,
    selectedProduct: null,
    availableColors: [], // Initialize empty state
    availableSizes: [],  // Initialize empty state
  }
}

export class ShopPresenter {
  private readonly service: ShopService
  private readonly session: ClientSessionState
  private readonly productType: ProductType | 'all'
  private view: ShopPresenterView | null = null
  private model: ShopViewModel

  constructor(service: ShopService, session: ClientSessionState, options: ShopPresenterOptions = {}) {
    this.service = service
    this.session = session
    this.productType = options.productType ?? 'all'
    this.model = createInitialShop(this.productType)
  }

  attach(view: ShopPresenterView): void {
    this.view = view
  }

  detach(): void {
    this.view = null
  }

  // Update this to use Promise.all to fetch the initial batch AND the global filters concurrently
  async loadInitial(): Promise<void> {
    await this.run(async () => {
      const [batch, filterOptions] = await Promise.all([
        this.service.listShopProducts({ filters: this.model.filters, batchSize: 20, sort: this.model.sort, direction: this.model.direction }),
        this.service.getShopFilterOptions()
      ])

      this.model = {
        ...this.model,
        products: batch.products,
        filters: batch.appliedFilters,
        nextCursor: batch.nextCursor,
        hasMore: batch.hasMore,
        availableColors: filterOptions.colors,
        availableSizes: filterOptions.sizes,
      }
      this.publish()
    })
  }

  async applyFilters(filters: ShopProductFilters, sort: ProductSortKey = this.model.sort, direction: ProductSortDirection = this.model.direction): Promise<void> {
    await this.loadBatch({ filters: this.withPageType(filters), batchSize: 20, sort, direction }, false)
  }

  async loadMore(): Promise<void> {
    if (!this.model.hasMore || !this.model.nextCursor) return
    await this.loadBatch({ filters: this.model.filters, afterId: this.model.nextCursor, batchSize: 20, sort: this.model.sort, direction: this.model.direction }, true)
  }

  selectProduct(product: Product | null): void {
    this.model = { ...this.model, selectedProduct: product, notice: undefined }
    this.publish()
  }

  async addSelectedToCart(input: Omit<CartItemInput, 'productId' | 'productType'>): Promise<void> {
    const product = this.model.selectedProduct
    if (!product) return
    if (product.type === 'pattern' && this.session.status !== 'authenticated') {
      this.model = { ...this.model, notice: 'Please log in to buy patterns.' }
      this.publish()
      return
    }

    await this.run(async () => {
      await this.service.addCartItem({ ...input, productId: product.id, productType: product.type })
      this.model = { ...this.model, selectedProduct: null, notice: 'Added to cart.' }
      this.publish()
    })
  }

  private async loadBatch(request: ShopProductBatchRequest, append: boolean): Promise<void> {
    await this.run(async () => {
      const batch = await this.service.listShopProducts(request)
      this.model = {
        products: append ? [...this.model.products, ...batch.products] : batch.products,
        filters: batch.appliedFilters,
        sort: request.sort ?? this.model.sort,
        direction: request.direction ?? this.model.direction,
        nextCursor: batch.nextCursor,
        hasMore: batch.hasMore,
        selectedProduct: this.model.selectedProduct,
        availableColors: this.model.availableColors, // Preserve global colors
        availableSizes: this.model.availableSizes,   // Preserve global sizes
      }
      this.publish()
    })
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.view?.setBusy(true)
    this.view?.setError(null)
    try {
      await action()
    } catch (error) {
      this.view?.setError(error instanceof Error ? error.message : 'Shop action failed.')
    } finally {
      this.view?.setBusy(false)
    }
  }

  private publish(): void {
    this.view?.setShop(this.model)
  }

  private withPageType(filters: ShopProductFilters): ShopProductFilters {
    return { ...filters, type: this.productType }
  }
}
