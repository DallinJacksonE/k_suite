import type { ClientApiService } from '../service/ClientApiService'
import type { HomeViewModel } from '../service/ClientTypes'

export interface HomePresenterView {
  setHome(model: HomeViewModel): void
  setBusy(isBusy: boolean): void
  setError(message: string | null): void
}

export type HomeService = Pick<ClientApiService, 'listFeaturedProducts' | 'getNextMarketEvent'>

export class HomePresenter {
  private readonly service: HomeService
  private view: HomePresenterView | null = null

  constructor(service: HomeService) {
    this.service = service
  }

  attach(view: HomePresenterView): void {
    this.view = view
  }

  detach(): void {
    this.view = null
  }

  async refreshHome(): Promise<void> {
    this.view?.setBusy(true)
    this.view?.setError(null)

    try {
      const [featuredProducts, nextMarket] = await Promise.all([
        this.service.listFeaturedProducts(),
        this.service.getNextMarketEvent(),
      ])
      this.view?.setHome({ featuredProducts, nextMarket })
    } catch (error) {
      this.view?.setError(error instanceof Error ? error.message : 'Unable to load home page content.')
    } finally {
      this.view?.setBusy(false)
    }
  }
}
