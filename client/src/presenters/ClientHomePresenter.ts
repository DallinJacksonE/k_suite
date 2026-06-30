import type { ClientApiService } from '../service/ClientApiService'

export interface ClientHomeView {
  setBusy(isBusy: boolean): void
  setStatus(message: string): void
  setError(message: string | null): void
  setBackendStatus(message: string): void
}

export class ClientHomePresenter {
  private readonly service: ClientApiService
  private view: ClientHomeView | null = null

  constructor(service: ClientApiService) {
    this.service = service
  }

  attach(view: ClientHomeView): void {
    this.view = view
    void this.refreshBackendStatus()
  }

  detach(): void {
    this.view = null
  }

  async refreshBackendStatus(): Promise<void> {
    await this.run('Client frontend foundation is ready.', async () => {
      const health = await this.service.checkHealth()
      this.view?.setBackendStatus(`${health.status} at ${health.timestamp}`)
    })
  }

  private async run(successMessage: string, action: () => Promise<void>): Promise<void> {
    this.view?.setBusy(true)
    this.view?.setError(null)

    try {
      await action()
      this.view?.setStatus(successMessage)
    } catch (error) {
      this.view?.setError(error instanceof Error ? error.message : 'Unexpected client frontend failure.')
    } finally {
      this.view?.setBusy(false)
    }
  }
}
