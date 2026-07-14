import type { CartLineItemSnapshot, CartSnapshot, CheckoutEstimateRequest, CheckoutEstimateResponse, CheckoutRequest, CheckoutResult, UpdateCartItemInput } from '../service/ClientTypes'

export interface CartViewModel extends CartSnapshot {
  estimate?: CheckoutEstimateResponse
  checkoutResult?: CheckoutResult
}

export interface CartPresenterView {
  setCart(model: CartViewModel): void
  setBusy(isBusy: boolean): void
  setError(message: string | null): void
}

export interface CartService {
  getCart(): Promise<CartSnapshot>
  updateCartItem(itemId: string, input: UpdateCartItemInput): Promise<CartSnapshot>
  removeCartItem(productType: CartLineItemSnapshot['productType'], itemId: string): Promise<CartSnapshot>
  estimateCheckout(input: CheckoutEstimateRequest): Promise<CheckoutEstimateResponse>
  checkout(input: CheckoutRequest): Promise<CheckoutResult>
}

export class CartPresenter {
  private readonly service: CartService
  private view: CartPresenterView | null = null
  private model: CartViewModel = { items: [], subtotal: 0, containsPatterns: false, guestCheckoutAllowed: true }

  constructor(service: CartService) {
    this.service = service
  }

  attach(view: CartPresenterView): void {
    this.view = view
  }

  detach(): void {
    this.view = null
  }

  async loadCart(): Promise<void> {
    await this.run(async () => {
      this.model = await this.service.getCart()
      this.publish()
    })
  }

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    await this.run(async () => {
      this.model = { ...await this.service.updateCartItem(itemId, { quantity }), estimate: this.model.estimate }
      this.publish()
    })
  }

  async removeItem(item: CartLineItemSnapshot): Promise<void> {
    await this.run(async () => {
      this.model = { ...await this.service.removeCartItem(item.productType, item.itemId), estimate: this.model.estimate }
      this.publish()
    })
  }

  async estimate(input: CheckoutEstimateRequest): Promise<void> {
    await this.run(async () => {
      this.model = { ...this.model, estimate: await this.service.estimateCheckout(input) }
      this.publish()
    })
  }


  async checkout(input: Omit<CheckoutRequest, 'idempotencyKey' | 'paymentStatus' | 'paymentToken'>): Promise<void> {
    await this.run(async () => {
      const checkoutResult = await this.service.checkout({ ...input, idempotencyKey: createCheckoutKey(), paymentStatus: 'paid', paymentToken: 'test-checkout-token' })
      this.model = { ...await this.service.getCart(), checkoutResult }
      this.publish()
    })
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.view?.setBusy(true)
    this.view?.setError(null)
    try {
      await action()
    } catch (error) {
      this.view?.setError(error instanceof Error ? error.message : 'Cart action failed.')
    } finally {
      this.view?.setBusy(false)
    }
  }

  private publish(): void {
    this.view?.setCart(this.model)
  }
}


function createCheckoutKey(): string {
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
