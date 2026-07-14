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
            <Route path="/plushies" element={<ShopView productType="plushie" title="Shop ready-to-love plushies." description="Browse handmade plushies, filter by size or color, and add favorites to your cart as a guest or signed-in customer." />} />
            <Route path="/patterns" element={<ShopView productType="pattern" title="Shop crochet patterns." description="Browse downloadable pattern PDFs separately from finished plushies. Pattern purchases require login so downloads can stay tied to your account." />} />
            <Route path="/markets" element={<MarketsView />} />
            <Route path="/blog" element={<BlogView />} />
            <Route path="/blog/collections/:collectionTag" element={<BlogView mode="collection" />} />
            <Route path="/blog/:slug" element={<BlogView mode="article" />} />
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
