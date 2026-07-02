import type { ClientApiService } from '../service/ClientApiService'
import type { MarketEventSummary } from '../service/ClientTypes'

export interface MarketsViewModel { loading: boolean; events: MarketEventSummary[]; nextEvent: MarketEventSummary | null; error?: string }
export interface MarketsPresenterView { renderMarkets(model: MarketsViewModel): void }

export class MarketsPresenter {
  private model: MarketsViewModel = { loading: false, events: [], nextEvent: null }
  private readonly service: ClientApiService
  private readonly view: MarketsPresenterView

  constructor(service: ClientApiService, view: MarketsPresenterView) { this.service = service; this.view = view }

  async load(): Promise<void> {
    this.update({ loading: true, error: undefined })
    try {
      const response = await this.service.listMarketEvents()
      this.update({ loading: false, events: response.events, nextEvent: response.nextEvent ?? response.events[0] ?? null })
    } catch (error) {
      this.update({ loading: false, error: error instanceof Error ? error.message : 'Unable to load markets.' })
    }
  }

  private update(patch: Partial<MarketsViewModel>) { this.model = { ...this.model, ...patch }; this.view.renderMarkets(this.model) }
}
