import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'

import { ClientNavbar } from '../src/components/layout/ClientNavbar'
import { ClientShell } from '../src/components/layout/ClientShell'
import { CartView } from '../src/view/CartView'
import { HomeView } from '../src/view/HomeView'
import { LoginView } from '../src/view/LoginView'
import { MarketsView } from '../src/view/MarketsView'
import { ProfileView } from '../src/view/ProfileView'
import { ShopView } from '../src/view/ShopView'

test('client shell exposes navbar and route skeleton components', () => {
  assert.equal(createElement(ClientNavbar).type, ClientNavbar)
  assert.equal(createElement(ClientShell, { children: 'content' }).type, ClientShell)
  assert.equal(createElement(HomeView).type, HomeView)
  assert.equal(createElement(ShopView).type, ShopView)
  assert.equal(createElement(MarketsView).type, MarketsView)
  assert.equal(createElement(CartView).type, CartView)
  assert.equal(createElement(ProfileView).type, ProfileView)
  assert.equal(createElement(LoginView).type, LoginView)
})
