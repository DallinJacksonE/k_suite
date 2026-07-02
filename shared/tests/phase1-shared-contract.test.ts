import type {
  BillingAddress,
  CheckoutContact,
  CheckoutEstimate,
  CheckoutIdempotencyKey,
  CheckoutRequest,
  CheckoutResult,
  CheckoutTotals,
  ClientProfileResponse,
  CsrfTokenResponse,
  MarketEvent,
  MarketEventResponse,
  OrderContactSnapshot,
  OrderEmailEvent,
  OrderLineItemSnapshot,
  Product,
  ProductSize,
  ProductSortDirection,
  ProductSortKey,
  PurchasedPatternDownload,
  RateLimitErrorResponse,
  ShippingAddress,
  ShopProductBatchRequest,
  ShopProductBatchResponse,
  ShopProductFilters,
  ToastRequest,
  ToastVariant,
  UserAddressBook,
  UserProfileDetails,
} from '../src/index.js';
import { DEFAULT_TOAST_DURATION_MS } from '../src/toast.js';

const size: ProductSize = 'medium';
const sortKey: ProductSortKey = 'price';
const sortDirection: ProductSortDirection = 'asc';
const idempotencyKey: CheckoutIdempotencyKey = 'checkout-123';

const shippingAddress: ShippingAddress = {
  name: 'Jane Customer',
  line1: '123 Market St',
  line2: 'Unit 4',
  city: 'Pittsburgh',
  region: 'PA',
  postalCode: '15222',
  country: 'US',
};

const billingAddress: BillingAddress = {
  ...shippingAddress,
  sameAsShipping: false,
};

const contact: CheckoutContact = {
  email: 'jane@example.com',
  name: 'Jane Customer',
  phone: '555-0100',
};

const orderContactSnapshot: OrderContactSnapshot = {
  contact,
  shippingAddress,
  billingAddress,
};

const lineItemSnapshot: OrderLineItemSnapshot = {
  productId: 'product-1',
  productType: 'plushie',
  title: 'Blue Dragon',
  quantity: 2,
  unitPrice: 24,
  salePrice: 20,
  selectedColor: 'blue',
  selectedSize: size,
  clientInstructions: 'gift wrap',
  lineTotal: 40,
};

const totals: CheckoutTotals = {
  subtotal: 48,
  discountTotal: 8,
  shipping: 5,
  tax: 2.7,
  grandTotal: 47.7,
};

const estimate: CheckoutEstimate = {
  contact,
  shippingAddress,
  billingAddress,
  totals,
  lineItems: [lineItemSnapshot],
  freeShippingApplied: false,
};

const request: CheckoutRequest = {
  idempotencyKey,
  contact,
  shippingAddress,
  billingAddress,
  paymentStatus: 'pending',
};

const result: CheckoutResult = {
  orderId: 'order-1',
  status: 'pending',
  totals,
  purchasedPatternDownloadsAvailable: false,
};

const filters: ShopProductFilters = {
  type: 'all',
  saleOnly: true,
  color: 'blue',
  size,
  tags: ['dragon'],
};

const batchRequest: ShopProductBatchRequest = {
  filters,
  batchSize: 20,
  afterId: 'product-1',
  sort: sortKey,
  direction: sortDirection,
};

const product: Product = {
  id: 'product-1',
  type: 'plushie',
  title: 'Blue Dragon',
  price: 24,
  salePrice: 20,
  isSaleItem: true,
  description: 'A plush dragon.',
  thumbnailImage: '/dragon.jpg',
  available: true,
  readyToShip: true,
  colorVariations: [{ name: 'blue' }],
  sizes: [size],
  tags: ['dragon'],
  inventoryCount: 3,
};

const batchResponse: ShopProductBatchResponse = {
  products: [product],
  nextCursor: 'product-2',
  hasMore: true,
  appliedFilters: filters,
};

const addressBook: UserAddressBook = {
  shippingAddress,
  billingAddress,
};

const patternDownload: PurchasedPatternDownload = {
  productId: 'pattern-1',
  orderId: 'order-2',
  title: 'Dragon Pattern',
  purchasedAt: '2026-06-30T00:00:00.000Z',
};

const profileDetails: UserProfileDetails = {
  email: 'jane@example.com',
  name: 'Jane Customer',
  addressBook,
  emailNotificationsEnabled: true,
};

const profileResponse: ClientProfileResponse = {
  user: profileDetails,
  orders: [],
  purchasedPatterns: [patternDownload],
};

const marketEvent: MarketEvent = {
  id: 'market-1',
  title: 'Summer Market',
  location: 'Downtown',
  startsAt: '2026-07-01T10:00:00.000Z',
  endsAt: '2026-07-01T14:00:00.000Z',
  description: 'Outdoor craft market',
  externalUrl: 'https://example.com/market',
};

const markets: MarketEventResponse = {
  events: [marketEvent],
  nextEvent: marketEvent,
};

const csrf: CsrfTokenResponse = {
  token: 'csrf-token',
  headerName: 'x-csrf-token',
};

const rateLimit: RateLimitErrorResponse = {
  error: 'rate_limited',
  message: 'Too many attempts.',
  retryAfterSeconds: 60,
};

const emailEvent: OrderEmailEvent = 'order_created';
const toastVariant: ToastVariant = 'success';
const toastRequest: ToastRequest = {
  message: 'Saved successfully.',
  variant: toastVariant,
  durationMs: DEFAULT_TOAST_DURATION_MS,
};

void [
  orderContactSnapshot,
  estimate,
  request,
  result,
  batchRequest,
  batchResponse,
  addressBook,
  profileResponse,
  markets,
  csrf,
  rateLimit,
  emailEvent,
  toastRequest,
];
