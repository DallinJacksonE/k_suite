import { ToastProvider } from '@k_suite/shared/toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ClientSessionProvider } from './components/auth/ClientSessionProvider'
import { BlogView } from './view/BlogView'
import { CartView } from './view/CartView'
import { HomeView } from './view/HomeView'
import { LoginView } from './view/LoginView'
import { MarketsView } from './view/MarketsView'
import { ProfileView } from './view/ProfileView'
import { ShopView } from './view/ShopView'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ClientSessionProvider>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/shop" element={<ShopView />} />
            <Route path="/markets" element={<MarketsView />} />
            <Route path="/blog" element={<BlogView />} />
            <Route path="/cart" element={<CartView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClientSessionProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
