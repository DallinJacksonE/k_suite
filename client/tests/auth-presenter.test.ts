import assert from 'node:assert/strict'
import test from 'node:test'

import { AuthPresenter, type AuthViewModel } from '../src/presenters/AuthPresenter'
import type { AuthPresenterService, RegistrationInput } from '../src/presenters/AuthPresenter'
import type { ClientSessionState, UpdateProfileInput } from '../src/service/ClientTypes'

function createService(calls: string[]): AuthPresenterService {
  return {
    login: async (input) => {
      calls.push(`login:${input.email}`)
      assert.equal(input.password, 'pw')
      return authenticated(input.email)
    },
    register: async (input) => {
      calls.push(`register:${input.email}:${input.name}`)
      assert.equal(input.password, 'pw')
      return authenticated(input.email)
    },
    updateProfile: async (input: UpdateProfileInput) => {
      calls.push(`profile:${input.email}:${input.addressBook?.shippingAddress?.line1}`)
      return {}
    },
  }
}

test('auth presenter logs in through the service boundary', async () => {
  const calls: string[] = []
  const updates: AuthViewModel[] = []
  let authenticatedCount = 0
  const presenter = new AuthPresenter(createService(calls), {
    renderAuth: (model) => updates.push(model),
    onAuthenticated: () => { authenticatedCount += 1 },
  })

  await presenter.login({ email: ' Ada@Example.COM ', password: 'pw' })

  assert.deepEqual(calls, ['login:ada@example.com'])
  assert.equal(updates.at(-1)?.message, 'You are logged in.')
  assert.equal(authenticatedCount, 1)
})

test('auth presenter registers then saves the shipping address through the profile service', async () => {
  const calls: string[] = []
  const updates: AuthViewModel[] = []
  let authenticatedCount = 0
  const presenter = new AuthPresenter(createService(calls), {
    renderAuth: (model) => updates.push(model),
    onAuthenticated: () => { authenticatedCount += 1 },
  })

  await presenter.register(registrationInput())

  assert.deepEqual(calls, [
    'register:grace@example.com:Grace Hopper',
    'profile:grace@example.com:123 Main St',
  ])
  assert.equal(updates.at(-1)?.message, 'Your account is ready.')
  assert.equal(authenticatedCount, 1)
})

test('auth presenter validates registration before calling the backend service', async () => {
  const calls: string[] = []
  const updates: AuthViewModel[] = []
  const presenter = new AuthPresenter(createService(calls), {
    renderAuth: (model) => updates.push(model),
    onAuthenticated: () => {},
  })

  await presenter.register({ ...registrationInput(), shippingAddress: { ...registrationInput().shippingAddress, city: '' } })

  assert.deepEqual(calls, [])
  assert.equal(updates.at(-1)?.error, 'Shipping city is required.')
})

function authenticated(email: string): ClientSessionState {
  return { status: 'authenticated', user: { email, name: 'Customer', cart: [], pdfKeys: [] } }
}

function registrationInput(): RegistrationInput {
  return {
    email: ' Grace@Example.COM ',
    name: ' Grace Hopper ',
    password: 'pw',
    shippingAddress: {
      name: ' Grace Hopper ',
      line1: ' 123 Main St ',
      line2: '',
      city: 'Arlington',
      region: 'VA',
      postalCode: '22201',
      country: 'US',
    },
  }
}
