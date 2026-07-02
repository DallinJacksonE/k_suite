import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@k_suite/shared/toast.css'
import './index.css'
import './components/layout/ClientShell.css'
import './view/HomeView.css'
import './view/LoginView.css'
import './view/BlogView.css'
import './view/ShopView.css'
import './view/CartView.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
