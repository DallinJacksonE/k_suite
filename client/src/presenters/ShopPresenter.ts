import type { ClientSessionState, Product, ShopProductBatchRequest, ShopProductFilters, ShopViewModel, CartItemInput } from '../service/ClientTypes'

export interface ShopPresenterView {
  setShop(model: ShopViewModel): void
  setBusy(isBusy: boolean): void
  setError(message: string | null): void
}

export interface ShopService {
  listShopProducts(request: ShopProductBatchRequest): Promise<{ products: Product[]; nextCursor?: string; hasMore: boolean; appliedFilters: ShopProductFilters }>
  addCartItem(input: CartItemInput): Promise<{ cart: CartItemInput[] }>
}

const initialShop: ShopViewModel = {
  products: [],
  filters: { type: 'all' },
  hasMore: false,
  selectedProduct: null,
}

export class ShopPresenter {
  private readonly service: ShopService
  private readonly session: ClientSessionState
  private view: ShopPresenterView | null = null
  private model: ShopViewModel = initialShop

  constructor(service: ShopService, session: ClientSessionState) {
    this.service = service
    this.session = session
  }

  attach(view: ShopPresenterView): void {
    this.view = view
  }

  detach(): void {
    this.view = null
  }

  async loadInitial(): Promise<void> {
    await this.loadBatch({ filters: { type: 'all' }, batchSize: 20, sort: 'createdAt', direction: 'desc' }, false)
  }

  async applyFilters(filters: ShopProductFilters): Promise<void> {
    await this.loadBatch({ filters, batchSize: 20, sort: 'createdAt', direction: 'desc' }, false)
  }

  async loadMore(): Promise<void> {
    if (!this.model.hasMore || !this.model.nextCursor) return
    await this.loadBatch({ filters: this.model.filters, afterId: this.model.nextCursor, batchSize: 20, sort: 'createdAt', direction: 'desc' }, true)
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
        nextCursor: batch.nextCursor,
        hasMore: batch.hasMore,
        selectedProduct: this.model.selectedProduct,
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
}
