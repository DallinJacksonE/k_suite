import type { ClientApiService } from '../service/ClientApiService'
import type { HomeViewModel } from '../service/ClientTypes'

export interface HomePresenterView {
  setHome(model: HomeViewModel): void
}

export type HomeService = Pick<ClientApiService, 'getNextMarketEvent'>

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
    const nextMarket = await this.service.getNextMarketEvent()
    this.view?.setHome({ nextMarket })
  }
}
