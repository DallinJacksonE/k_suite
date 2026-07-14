import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useClientSession } from '../auth/useClientSession'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartShopping } from '@fortawesome/free-solid-svg-icons'

const navigationLinks = [
  { to: '/plushies', label: 'Plushies' },
  { to: '/patterns', label: 'Patterns' },
  { to: '/blog', label: 'Blog' },
  { to: '/markets', label: 'Markets' },
  { to: '/cart', label: 'Cart' },
]

export function ClientNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { session, canViewProfile, logout } = useClientSession()
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
        Kaylie&apos;s Creations
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
            {link.label === 'Cart' ? <FontAwesomeIcon icon={faCartShopping} /> : link.label}
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
