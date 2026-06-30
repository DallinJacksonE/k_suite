import type { CartSnapshot, CheckoutEstimateRequest, CheckoutEstimateResponse, UpdateCartItemInput } from '../service/ClientTypes'

export interface CartViewModel extends CartSnapshot {
  estimate?: CheckoutEstimateResponse
}

export interface CartPresenterView {
  setCart(model: CartViewModel): void
  setBusy(isBusy: boolean): void
  setError(message: string | null): void
}

export interface CartService {
  getCart(): Promise<CartSnapshot>
  updateCartItem(itemId: string, input: UpdateCartItemInput): Promise<CartSnapshot>
  estimateCheckout(input: CheckoutEstimateRequest): Promise<CheckoutEstimateResponse>
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

  async estimate(input: CheckoutEstimateRequest): Promise<void> {
    await this.run(async () => {
      this.model = { ...this.model, estimate: await this.service.estimateCheckout(input) }
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
