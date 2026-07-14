import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/libertinus-serif';
import '@k_suite/shared/toast.css'
import './index.css'
import './components/layout/ClientShell.css'
import './components/markets/MarketListingCard.css'
import './view/HomeView.css'
import './view/LoginView.css'
import './view/BlogView.css'
import './view/ShopView.css'
import './components/shop/ShopFilters.css'
import './components/shop/ProductDetailModal.css'
import './view/ProfileView.css'
import './view/CartView.css'
import './components/cart/CartComponents.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
