export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  name: string
  password: string
}

export type ClientSessionState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; user: PublicUser }

export interface PublicUser {
  email: string
  name: string
  cart: unknown[]
  pdfKeys: string[]
}

export interface UserProfileDetails {
  email: string
  name: string
  addressBook?: UserAddressBook
  emailNotificationsEnabled?: boolean
}

export interface ShippingAddress { name: string; line1: string; line2?: string; city: string; region: string; postalCode: string; country: string }
export interface BillingAddress extends ShippingAddress { sameAsShipping?: boolean }
export interface UserAddressBook { shippingAddress?: ShippingAddress; billingAddress?: BillingAddress }
export interface UpdateProfileInput { email: string; name?: string; password?: string; addressBook?: UserAddressBook; emailNotificationsEnabled?: boolean }

export interface OrderRecord {
  orderId: string
  productId: string
  clientEmail: string
  details: Record<string, unknown>
  clientInstructions: string
  chargedAmount: number
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface PurchasedPatternDownload {
  productId: string
  orderId: string
  title: string
  purchasedAt: string
  downloadUrl?: string
  expiresAt?: string
}

export interface PurchasedPatternsResponse { patterns: PurchasedPatternDownload[] }

export interface ClientProfileResponse {
  user: UserProfileDetails
  orders: OrderRecord[]
  purchasedPatterns: PurchasedPatternDownload[]
}

export interface CsrfTokenResponse {
  token: string
  headerName: string
}

export type ProductType = 'plushie' | 'pattern'
export type ProductSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large'

export interface ProductColorVariation {
  name: string
  imageUrl?: string
}

export interface ProductBase {
  id: string
  type: ProductType
  title: string
  price: number
  salePrice?: number
  isSaleItem: boolean
  description: string
  thumbnailImage: string
  available: boolean
  sizes: ProductSize[]
  tags?: string[]
  inventoryCount?: number
}

export interface PlushieProduct extends ProductBase {
  type: 'plushie'
  readyToShip: boolean
  colorVariations: ProductColorVariation[]
}

export interface PatternProduct extends ProductBase {
  type: 'pattern'
  pdfKey: string
}

export type Product = PlushieProduct | PatternProduct

export interface ShopProductListResponse {
  products: Product[]
}

export interface MarketEventSummary {
  id: string
  title: string
  startsAt: string
  locationName?: string
  location?: string
  address?: string
  endsAt?: string
  description?: string
  externalUrl?: string
  source?: 'temporary-placeholder'
}

export interface MarketEventResponse { events: MarketEventSummary[]; nextEvent?: MarketEventSummary }

export interface BlogHeadingBlock { type: 'heading'; level: 1 | 2 | 3; text: string }
export interface BlogParagraphBlock { type: 'paragraph'; text: string }
export interface BlogImageBlock { type: 'image'; url: string; alt: string }
export interface BlogYoutubeBlock { type: 'youtube'; videoId: string; title?: string }
export type BlogArticleBlock = BlogHeadingBlock | BlogParagraphBlock | BlogImageBlock | BlogYoutubeBlock

export const DEFAULT_BLOG_COLLECTION_TAG = 'kaylies-creations-updates'

export interface BlogCollection {
  tag: string
  label: string
  description?: string
}

export interface BlogArticle {
  articleId: string
  title: string
  slug: string
  excerpt: string
  blocks: BlogArticleBlock[]
  collectionTags: string[]
  published: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BlogArticleResponse { articles: BlogArticle[] }
export interface BlogCollectionResponse { collections: BlogCollection[] }

export interface HomeViewModel {
  nextMarket: MarketEventSummary | null
}

export type ProductSortKey = 'createdAt' | 'price' | 'title'
export type ProductSortDirection = 'asc' | 'desc'
export type ShopProductTypeFilter = ProductType | 'all'

export interface ShopProductFilters {
  type?: ShopProductTypeFilter
  saleOnly?: boolean
  color?: string
  size?: string
  tags?: string[]
}

export interface ShopProductBatchRequest {
  filters?: ShopProductFilters
  batchSize?: number
  afterId?: string
  sort?: ProductSortKey
  direction?: ProductSortDirection
}

export interface ShopProductBatchResponse {
  products: Product[]
  nextCursor?: string
  hasMore: boolean
  appliedFilters: ShopProductFilters
}

export interface ShopProductFilterOptions {
  colors: string[]
  sizes: ProductSize[]
}

export interface ShopViewModel {
  products: Product[]
  filters: ShopProductFilters
  sort: ProductSortKey
  direction: ProductSortDirection
  nextCursor?: string
  hasMore: boolean
  selectedProduct: Product | null
  notice?: string
  purchasedPatternProductIds: string[]
  availableColors: string[]
  availableSizes: ProductSize[]
}

export interface CartItemInput {
  productId: string
  productType?: ProductType
  quantity?: number
  colorVariation?: string
  selectedColor?: string
  selectedSize?: ProductSize
  clientInstructions?: string
}

export interface CartResponse {
  cart: CartItemInput[]
}

export interface UpdateCartItemInput {
  quantity?: number
  colorVariation?: string
  selectedColor?: string
  selectedSize?: ProductSize
  clientInstructions?: string
}

export interface CartLineItemSnapshot {
  itemId: string
  productId: string
  productType: ProductType
  title: string
  thumbnailImage: string
  quantity: number
  unitPrice: number
  regularUnitPrice: number
  salePrice?: number
  lineTotal: number
  selectedColor?: string
  selectedSize?: ProductSize
  clientInstructions: string
}

export interface CartSnapshot {
  items: CartLineItemSnapshot[]
  subtotal: number
  containsPatterns: boolean
  guestCheckoutAllowed: boolean
}

export interface CheckoutAddress {
  country: string
  state?: string
  postalCode?: string
}

export interface CheckoutEstimateRequest {
  shippingAddress: CheckoutAddress
  billingAddress?: CheckoutAddress
}

export interface CheckoutEstimateResponse {
  subtotal: number
  shipping: number
  tax: number
  discount: number
  grandTotal: number
  currency: 'USD'
}

export interface CheckoutPublicConfig {
  provider: 'square' | 'test'
  square?: {
    applicationId: string
    locationId: string
    environment: 'production' | 'sandbox'
  }
}


export interface CheckoutContact {
  email: string
  name: string
  phone?: string
}

export interface CheckoutFullAddress {
  name: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
}

export interface CheckoutBillingAddress extends CheckoutFullAddress {
  sameAsShipping?: boolean
}

export interface CheckoutRequest {
  idempotencyKey: string
  contact: CheckoutContact
  shippingAddress: CheckoutFullAddress
  billingAddress: CheckoutBillingAddress
  paymentStatus?: 'pending' | 'authorized' | 'paid' | 'failed'
  paymentToken?: string
}

export interface CheckoutResult {
  orderId: string
  status: 'pending' | 'paid' | 'fulfilled' | 'shipped' | 'cancelled' | 'refunded'
  totals: { subtotal: number; discountTotal: number; shipping: number; tax: number; grandTotal: number }
  purchasedPatternDownloadsAvailable: boolean
}


