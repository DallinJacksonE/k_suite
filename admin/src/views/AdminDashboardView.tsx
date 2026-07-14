import { useToast } from '@k_suite/shared/toast'
import { useEffect, useMemo, useState } from 'react'
import type { AdminRefundOrderInput, AdminUserAccount, AdminUserUpdateInput, ApiEndpointDoc, BlogArticleInput, BlogArticleRecord, BlogCollectionInput, BlogCollectionRecord, MarketEventInput, MarketEventRecord, OrderRecord, ProductRecord, ServiceHealthReport, UpdateProductInput } from '../service/AdminApiService'
import { FetchAdminApiService } from '../service/AdminApiService'
import type { AdminDashboardView as AdminDashboardViewContract, ProductFormInput, UploadedAsset } from '../presenter/AdminDashboardPresenter'
import { AdminDashboardPresenter } from '../presenter/AdminDashboardPresenter'
import { AdminLoginForm } from '../components/auth/AdminLoginForm'
import { BlogDashboard } from '../components/blog/BlogDashboard'
import { MarketsDashboard } from '../components/markets/MarketsDashboard'
import { OrdersDashboard } from '../components/orders/OrdersDashboard'
import { ProductDashboard } from '../components/products/ProductDashboard'
import { UsersDashboard } from '../components/users/UsersDashboard'
import { ServerMetricsDashboard } from '../components/serverMetrics/ServerMetricsDashboard'
import { AdminShell } from '../components/layout/AdminShell'
import type { AdminCategory } from '../components/layout/adminNavigation'
import { StatusBanner } from '../components/layout/StatusBanner'
import './AdminDashboardView.css'

export function AdminDashboardView() {
  const { showToast } = useToast()
  const presenter = useMemo(() => new AdminDashboardPresenter(new FetchAdminApiService()), [])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Ready to manage the backend.')
  const [error, setError] = useState<string | null>(null)
  const [adminName, setAdminName] = useState<string | null>(null)
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [backendStatus, setBackendStatus] = useState('Checking backend...')
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpointDoc[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [users, setUsers] = useState<AdminUserAccount[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [blogArticles, setBlogArticles] = useState<BlogArticleRecord[]>([])
  const [blogCollections, setBlogCollections] = useState<BlogCollectionRecord[]>([])
  const [marketEvents, setMarketEvents] = useState<MarketEventRecord[]>([])
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthReport | null>(null)
  const [, setUploadedAssets] = useState<UploadedAsset[]>([])
  const [activeCategory, setActiveCategory] = useState<AdminCategory>('orders')

  useEffect(() => {
    const view: AdminDashboardViewContract = {
      setBusy,
      setStatus: (message) => {
        setStatus(message)
        if (message) showToast({ message, variant: toastVariantForStatus(message) })
      },
      setError: (message) => {
        setError(message)
        if (message) showToast({ message, variant: 'danger', durationMs: 6_000 })
      },
      setAdminName,
      setAuthenticated,
      setBackendStatus,
      setApiEndpoints,
      setOrders,
      setUsers,
      setProducts,
      setBlogArticles,
      setBlogCollections,
      setMarketEvents,
      setServiceHealth,
      addCreatedProduct: (product) => setProducts((current) => [product, ...current.filter((item) => item.id !== product.id)]),
      addUploadedAsset: (asset) => setUploadedAssets((assets) => [asset, ...assets]),
    }
    presenter.attach(view)
    return () => presenter.detach()
  }, [presenter, showToast])

  if (!isAuthenticated) {
    return (
      <>
        <AdminLoginForm busy={busy} onLogin={(email, password) => void presenter.login({ email, password })} />
        <StatusBanner status={status} error={error} />
      </>
    )
  }

  return (
    <AdminShell adminName={adminName} activeCategory={activeCategory} busy={busy} onSelect={setActiveCategory} onLogout={() => presenter.logout()}>
      <StatusBanner status={status} error={error} />
      {activeCategory === 'orders' ? <OrdersDashboard orders={orders} busy={busy} onRefresh={() => void presenter.loadOrders()} onMarkShipped={(orderId) => void presenter.markOrderShipped(orderId)} /> : null}
      {activeCategory === 'users' ? <UsersDashboard users={users} busy={busy} onUpdate={(email: string, input: AdminUserUpdateInput) => void presenter.updateUser(email, input)} onDelete={(email: string) => void presenter.deleteUser(email)} onRefund={(orderId: string, input: AdminRefundOrderInput) => void presenter.refundOrder(orderId, input)} onRefresh={() => void presenter.loadUsers()} /> : null}
      {activeCategory === 'plushieProducts' ? <ProductDashboard productType="plushie" products={products} busy={busy} onCreate={(input: ProductFormInput) => presenter.createProduct(input)} onUpdate={(productId: string, input: UpdateProductInput) => void presenter.updateProduct(productId, input)} onDelete={(productId: string) => void presenter.deleteProduct(productId)} onUploadImage={(file) => presenter.uploadProductImage(file)} onUploadPdf={(file) => presenter.uploadPatternPdf({ file })} onRefresh={() => void presenter.loadProducts()} /> : null}
      {activeCategory === 'patternProducts' ? <ProductDashboard productType="pattern" products={products} busy={busy} onCreate={(input: ProductFormInput) => presenter.createProduct(input)} onUpdate={(productId: string, input: UpdateProductInput) => void presenter.updateProduct(productId, input)} onDelete={(productId: string) => void presenter.deleteProduct(productId)} onUploadImage={(file) => presenter.uploadProductImage(file)} onUploadPdf={(file) => presenter.uploadPatternPdf({ file })} onRefresh={() => void presenter.loadProducts()} /> : null}
      {activeCategory === 'blog' ? <BlogDashboard articles={blogArticles} collections={blogCollections} busy={busy} onCreate={(input: BlogArticleInput) => presenter.createBlogArticle(input)} onUpdate={(articleId, input) => void presenter.updateBlogArticle(articleId, input)} onDelete={(articleId) => void presenter.deleteBlogArticle(articleId)} onCreateCollection={(input: BlogCollectionInput) => presenter.createBlogCollection(input)} onUpdateCollection={(tag, input) => void presenter.updateBlogCollection(tag, input)} onDeleteCollection={(tag) => void presenter.deleteBlogCollection(tag)} onUploadImage={(file) => presenter.uploadBlogImage(file)} onRefresh={() => void Promise.all([presenter.loadBlogCollections(), presenter.loadBlogArticles()])} /> : null}
      {activeCategory === 'markets' ? <MarketsDashboard events={marketEvents} busy={busy} onCreate={(input: MarketEventInput) => presenter.createMarketEvent(input)} onUpdate={(eventId, input) => void presenter.updateMarketEvent(eventId, input)} onDelete={(eventId) => void presenter.deleteMarketEvent(eventId)} onRefresh={() => void presenter.loadMarketEvents()} /> : null}
      {activeCategory === 'serverMetrics' ? <ServerMetricsDashboard backendStatus={backendStatus} endpoints={apiEndpoints} health={serviceHealth} busy={busy} onRefresh={() => void Promise.all([presenter.refreshBackendSummary(), presenter.loadServiceHealth()])} /> : null}
    </AdminShell>
  )
}

function toastVariantForStatus(message: string): 'info' | 'success' {
  return message.toLowerCase().includes('loaded') ? 'info' : 'success'
}
