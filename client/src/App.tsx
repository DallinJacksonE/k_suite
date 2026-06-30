import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ClientSessionProvider } from './components/auth/ClientSessionProvider'
import { CartView } from './view/CartView'
import { HomeView } from './view/HomeView'
import { LoginView } from './view/LoginView'
import { MarketsView } from './view/MarketsView'
import { ProfileView } from './view/ProfileView'
import { ShopView } from './view/ShopView'

function App() {
  return (
    <BrowserRouter>
      <ClientSessionProvider>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/shop" element={<ShopView />} />
          <Route path="/markets" element={<MarketsView />} />
          <Route path="/cart" element={<CartView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClientSessionProvider>
    </BrowserRouter>
  )
}

export default App
