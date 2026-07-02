import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useClientSession } from '../auth/useClientSession'

const navigationLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/markets', label: 'Markets' },
  { to: '/blog', label: 'Blog' },
  { to: '/cart', label: 'Cart' },
]

export function ClientNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { session, canViewProfile, logout } = useClientSession()
  const cartCount = session.status === 'authenticated' ? session.user.cart.length : 0
  const profileTarget = canViewProfile ? '/profile' : '/login'
  const profileLabel = canViewProfile ? 'Profile' : 'Login / Register'
  const loggedIn = session.status === 'authenticated'

  async function logOut() {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="client-shell__header">
      <NavLink className="client-shell__brand" to="/" onClick={() => setMenuOpen(false)}>
        Kaylie&apos;s Suite
      </NavLink>
      <button
        className="client-shell__menu-button"
        type="button"
        aria-controls="client-navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        Menu
      </button>
      <nav
        id="client-navigation"
        className={`client-shell__nav${menuOpen ? ' client-shell__nav--open' : ''}`}
        aria-label="Client navigation"
      >
        {navigationLinks.map((link) => (
          <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
            {link.label === 'Cart' ? `Cart (${cartCount})` : link.label}
          </NavLink>
        ))}
        <NavLink to={profileTarget} onClick={() => setMenuOpen(false)}>
          {profileLabel}
        </NavLink>
        {loggedIn ? <button type="button" onClick={() => void logOut()}>Logout</button> : null}
      </nav>
    </header>
  )
}
