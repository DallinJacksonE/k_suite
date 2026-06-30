import assert from 'node:assert/strict'
import test from 'node:test'

import { FetchClientApiService } from '../src/service/ClientApiService'
import type { ClientSessionState } from '../src/service/ClientTypes'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
}

test('client API service uses cookie credentials for session auth methods', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetcher: typeof fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init })
    if (String(input).endsWith('/user/session')) return jsonResponse({ status: 'guest' })
    if (String(input).endsWith('/user/csrf')) return jsonResponse({ token: 'csrf-1', headerName: 'x-csrf-token' })
    if (String(input).endsWith('/user/login')) return jsonResponse({ status: 'authenticated', user: { email: 'a@example.com', name: 'Ada', cart: [], pdfKeys: [] } })
    if (String(input).endsWith('/user/auth')) return jsonResponse({ status: 'authenticated', user: { email: 'b@example.com', name: 'Grace', cart: [], pdfKeys: [] } }, { status: 201 })
    if (String(input).endsWith('/user/logout')) return new Response(null, { status: 204 })
    if (String(input).endsWith('/user/profile')) return jsonResponse({ user: { email: 'a@example.com', name: 'Ada' }, orders: [], purchasedPatterns: [] })
    throw new Error(`unexpected request ${String(input)}`)
  }
  const service = new FetchClientApiService('/api', fetcher)

  const session = await service.getSession()
  const login = await service.login({ email: 'a@example.com', password: 'pw' })
  const registered = await service.register({ email: 'b@example.com', name: 'Grace', password: 'pw' })
  const profile = await service.loadProfile()
  await service.logout()

  assert.deepEqual(session satisfies ClientSessionState, { status: 'guest' })
  assert.equal(login.status, 'authenticated')
  assert.equal(registered.status, 'authenticated')
  assert.equal(profile.user.email, 'a@example.com')
  assert.deepEqual(calls.map((call) => [call.url, call.init.method ?? 'GET', call.init.credentials]), [
    ['/api/user/session', 'GET', 'include'],
    ['/api/user/csrf', 'GET', 'include'],
    ['/api/user/login', 'POST', 'include'],
    ['/api/user/csrf', 'GET', 'include'],
    ['/api/user/auth', 'POST', 'include'],
    ['/api/user/profile', 'GET', 'include'],
    ['/api/user/logout', 'POST', 'include'],
  ])
  assert.equal((calls[2].init.headers as Record<string, string>)['x-csrf-token'], 'csrf-1')
})

test('client API service maps backend rate limits to readable errors', async () => {
  const fetcher: typeof fetch = async () => jsonResponse({ error: 'rate_limited', message: 'Too many attempts.', retryAfterSeconds: 60 }, { status: 429 })
  const service = new FetchClientApiService('/api', fetcher)

  await assert.rejects(() => service.login({ email: 'a@example.com', password: 'bad' }), /Too many attempts/)
})
