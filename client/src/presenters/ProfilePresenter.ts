import type { ClientApiService } from '../service/ClientApiService'
import type { ClientProfileResponse, PurchasedPatternDownload, UpdateProfileInput } from '../service/ClientTypes'

export interface ProfileViewModel {
  loading: boolean
  saving: boolean
  deleting: boolean
  profile: ClientProfileResponse | null
  message?: string
  error?: string
}

export interface ProfilePresenterView {
  renderProfile(model: ProfileViewModel): void
  onProfileDeleted(): void
}

export class ProfilePresenter {
  private model: ProfileViewModel = { loading: false, saving: false, deleting: false, profile: null }
  private readonly service: ClientApiService
  private readonly view: ProfilePresenterView

  constructor(service: ClientApiService, view: ProfilePresenterView) {
    this.service = service
    this.view = view
  }

  async load(): Promise<void> {
    this.update({ loading: true, error: undefined })
    try {
      this.update({ profile: await this.service.loadProfile(), loading: false })
    } catch (error) {
      this.update({ loading: false, error: readError(error) })
    }
  }

  async save(input: UpdateProfileInput): Promise<boolean> {
    this.update({ saving: true, error: undefined, message: undefined })
    try {
      await this.service.updateProfile(input)
      this.update({ saving: false, message: 'Profile updated.' })
      await this.load()
      return true
    } catch (error) {
      this.update({ saving: false, error: readError(error) })
      return false
    }
  }

  async downloadPattern(productId: string): Promise<PurchasedPatternDownload | null> {
    this.update({ error: undefined, message: undefined })
    try {
      const download = await this.service.createPurchasedPatternDownload(productId)
      this.update({ message: 'Download link created. Links expire soon.' })
      return download
    } catch (error) {
      this.update({ error: readError(error) })
      return null
    }
  }

  async deleteAccount(email: string, confirmation: string): Promise<void> {
    if (confirmation !== email) {
      this.update({ error: 'Type your email address to confirm account deletion.' })
      return
    }

    this.update({ deleting: true, error: undefined })
    try {
      await this.service.deleteProfile(email)
      this.view.onProfileDeleted()
    } catch (error) {
      this.update({ deleting: false, error: readError(error) })
    }
  }

  private update(patch: Partial<ProfileViewModel>): void {
    this.model = { ...this.model, ...patch }
    this.view.renderProfile(this.model)
  }
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
