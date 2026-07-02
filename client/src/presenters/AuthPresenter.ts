import type { ClientSessionState, LoginInput, ShippingAddress, UpdateProfileInput } from '../service/ClientTypes'

export interface AuthPresenterService {
  login(input: LoginInput): Promise<ClientSessionState>
  register(input: { email: string; name: string; password: string }): Promise<ClientSessionState>
  updateProfile(input: UpdateProfileInput): Promise<unknown>
}

export interface RegistrationInput {
  email: string
  name: string
  password: string
  shippingAddress: ShippingAddress
}

export interface AuthViewModel {
  busy: boolean
  message?: string
  error?: string
}

export interface AuthPresenterView {
  renderAuth(model: AuthViewModel): void
  onAuthenticated(): void
}

export class AuthPresenter {
  private model: AuthViewModel = { busy: false }
  private readonly service: AuthPresenterService
  private readonly view: AuthPresenterView

  constructor(service: AuthPresenterService, view: AuthPresenterView) {
    this.service = service
    this.view = view
  }

  async login(input: LoginInput): Promise<void> {
    const normalized = { email: input.email.trim().toLowerCase(), password: input.password }
    const validationError = validateLogin(normalized)
    if (validationError) {
      this.update({ busy: false, error: validationError, message: undefined })
      return
    }

    await this.submit('Logging in…', async () => {
      await this.service.login(normalized)
      this.update({ busy: false, message: 'You are logged in.', error: undefined })
      this.view.onAuthenticated()
    })
  }

  async register(input: RegistrationInput): Promise<void> {
    const registration = normalizeRegistration(input)
    const validationError = validateRegistration(registration)
    if (validationError) {
      this.update({ busy: false, error: validationError, message: undefined })
      return
    }

    await this.submit('Creating your account…', async () => {
      await this.service.register({ email: registration.email, name: registration.name, password: registration.password })
      await this.service.updateProfile({
        email: registration.email,
        addressBook: { shippingAddress: registration.shippingAddress },
      })
      this.update({ busy: false, message: 'Your account is ready.', error: undefined })
      this.view.onAuthenticated()
    })
  }

  private async submit(message: string, action: () => Promise<void>): Promise<void> {
    this.update({ busy: true, message, error: undefined })
    try {
      await action()
    } catch (error) {
      this.update({ busy: false, error: readError(error), message: undefined })
    }
  }

  private update(patch: Partial<AuthViewModel>): void {
    this.model = { ...this.model, ...patch }
    this.view.renderAuth(this.model)
  }
}

function normalizeRegistration(input: RegistrationInput): RegistrationInput {
  return {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    password: input.password,
    shippingAddress: {
      name: input.shippingAddress.name.trim(),
      line1: input.shippingAddress.line1.trim(),
      line2: input.shippingAddress.line2?.trim() || undefined,
      city: input.shippingAddress.city.trim(),
      region: input.shippingAddress.region.trim(),
      postalCode: input.shippingAddress.postalCode.trim(),
      country: input.shippingAddress.country.trim(),
    },
  }
}

function validateLogin(input: LoginInput): string | undefined {
  if (!input.email) return 'Email is required.'
  if (!input.password) return 'Password is required.'
  return undefined
}

function validateRegistration(input: RegistrationInput): string | undefined {
  if (!input.email) return 'Email is required.'
  if (!input.name) return 'Name is required.'
  if (!input.password) return 'Password is required.'
  if (!input.shippingAddress.name) return 'Shipping name is required.'
  if (!input.shippingAddress.line1) return 'Shipping address line 1 is required.'
  if (!input.shippingAddress.city) return 'Shipping city is required.'
  if (!input.shippingAddress.region) return 'Shipping state or region is required.'
  if (!input.shippingAddress.postalCode) return 'Shipping postal code is required.'
  if (!input.shippingAddress.country) return 'Shipping country is required.'
  return undefined
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
