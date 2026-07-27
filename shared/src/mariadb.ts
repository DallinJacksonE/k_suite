import type { CreateProductInput, Product, ProductSize, ProductSortDirection, ProductSortKey, ProductType, ShopProductBatchRequest, ShopProductBatchResponse, ShopProductFilterOptions, UpdateProductInput } from './products.js';

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'shipped' | 'cancelled' | 'refunded';
export type CookieKind = 'session' | 'client' | 'admin';
export type CheckoutIdempotencyKey = string;
export type CheckoutPaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed';
export type OrderEmailEvent = 'order_created' | 'order_fulfilled' | 'order_shipped' | 'order_cancelled';
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface BillingAddress extends ShippingAddress {
  sameAsShipping?: boolean;
}

export interface CheckoutContact {
  email: string;
  name: string;
  phone?: string;
}

export interface OrderContactSnapshot {
  contact: CheckoutContact;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
}

export interface OrderLineItemSnapshot {
  productId: string;
  productType: ProductType;
  title: string;
  quantity: number;
  unitPrice: number;
  salePrice?: number;
  selectedColor?: string;
  selectedSize?: ProductSize;
  clientInstructions?: string;
  lineTotal: number;
  pdfKey?: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discountTotal: number;
  shipping: number;
  tax: number;
  grandTotal: number;
}

export interface CheckoutEstimate {
  contact?: CheckoutContact;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  totals: CheckoutTotals;
  lineItems: OrderLineItemSnapshot[];
  freeShippingApplied: boolean;
}

export interface CheckoutRequest {
  idempotencyKey: CheckoutIdempotencyKey;
  contact: CheckoutContact;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  paymentStatus?: CheckoutPaymentStatus;
  paymentToken?: string;
}

export interface CheckoutResult {
  orderId: string;
  status: OrderStatus;
  totals: CheckoutTotals;
  purchasedPatternDownloadsAvailable: boolean;
}

export interface UserAddressBook {
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
}

export interface UserProfileDetails {
  email: string;
  name: string;
  addressBook?: UserAddressBook;
  emailNotificationsEnabled?: boolean;
}

export interface PurchasedPatternDownload {
  productId: string;
  orderId: string;
  title: string;
  purchasedAt: Date | string;
  downloadUrl?: string;
  expiresAt?: Date | string;
}

export interface PurchasedPatternRecord {
  userEmail: string;
  productId: string;
  orderId: string;
  pdfKey: string;
  purchasedAt?: Date | string;
}

export interface InsertPurchasedPatternInput {
  userEmail: string;
  productId: string;
  orderId: string;
  pdfKey: string;
}

export interface PatternDownloadSigner {
  signPatternPdf(pdfKey: string): Promise<{ url: string; expiresAt: Date | string }>;
}

export interface ClientProfileResponse {
  user: UserProfileDetails;
  orders: OrderRecord[];
  purchasedPatterns: PurchasedPatternDownload[];
}

export type ClientSessionState =
  | { status: 'guest' }
  | { status: 'authenticated'; user: PublicUser };

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface MarketEvent {
  id: string;
  title: string;
  location: string;
  address?: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  description?: string;
  externalUrl?: string;
}

export interface CreateMarketEventInput {
  title: string;
  location: string;
  address?: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  description?: string;
  externalUrl?: string;
}

export interface UpdateMarketEventInput {
  title?: string;
  location?: string;
  address?: string;
  startsAt?: Date | string;
  endsAt?: Date | string;
  description?: string;
  externalUrl?: string;
}

export interface MarketEventResponse {
  events: MarketEvent[];
  nextEvent?: MarketEvent;
}

export interface CsrfTokenResponse {
  token: string;
  headerName: string;
}

export interface RateLimitErrorResponse {
  error: 'rate_limited';
  message: string;
  retryAfterSeconds: number;
}

export interface UserRecord {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  cart: unknown[];
  pdfKeys: string[];
  addressBook?: UserAddressBook;
  emailNotificationsEnabled?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AdminRecord {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt?: Date | string;
}

export interface CookieRecord {
  email: string;
  cookie: string;
  kind: CookieKind;
  timeCreated: Date | string;
  lastSeenAt: Date | string;
  expiresAt: Date | string;
}

export interface GuestRecord {
  guestCookie: string;
  cart: unknown[];
  lastSeenAt: Date | string;
  expiresAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OrderRecord {
  orderId: string;
  idempotencyKey?: string;
  productId: string;
  clientEmail: string;
  details: Record<string, unknown>;
  clientInstructions: string;
  chargedAmount: number;
  status: OrderStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BlogHeadingBlock { type: 'heading'; level: 1 | 2 | 3; text: string }
export interface BlogParagraphBlock { type: 'paragraph'; text: string }
export interface BlogImageBlock { type: 'image'; url: string; alt: string }
export interface BlogYoutubeBlock { type: 'youtube'; videoId: string; title?: string }
export type BlogArticleBlock = BlogHeadingBlock | BlogParagraphBlock | BlogImageBlock | BlogYoutubeBlock;

export const DEFAULT_BLOG_COLLECTION_TAG = 'kaylies-creations-updates';

export interface BlogCollectionRecord {
  tag: string;
  label: string;
  description?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateBlogCollectionInput {
  tag?: string;
  label: string;
  description?: string;
}

export interface UpdateBlogCollectionInput {
  tag?: string;
  label?: string;
  description?: string;
}

export interface BlogArticleRecord {
  articleId: string;
  title: string;
  slug: string;
  excerpt: string;
  blocks: BlogArticleBlock[];
  collectionTags: string[];
  published: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateBlogArticleInput {
  title: string;
  slug: string;
  excerpt: string;
  blocks: BlogArticleBlock[];
  collectionTags?: string[];
  published?: boolean;
}

export interface UpdateBlogArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  blocks?: BlogArticleBlock[];
  collectionTags?: string[];
  published?: boolean;
}

export interface ServiceHealthCheck {
  name: string;
  status: 'ok' | 'error';
  message?: string;
}

export interface ServiceHealthReport {
  status: 'ok' | 'degraded';
  checkedAt: string;
  services: ServiceHealthCheck[];
}

export interface InsertUserInput {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  cart?: unknown[];
  pdfKeys?: string[];
}

export interface InsertAdminInput {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
}

export interface InsertOrderInput {
  orderId: string;
  idempotencyKey?: string;
  productId: string;
  clientEmail: string;
  details?: Record<string, unknown>;
  clientInstructions?: string;
  chargedAmount: number;
  status?: OrderStatus;
}

export interface UserPatch {
  name?: string;
  passwordHash?: string;
  salt?: string;
  cart?: unknown[];
  pdfKeys?: string[];
  addressBook?: UserAddressBook;
  emailNotificationsEnabled?: boolean;
}

export interface AddUserInput {
  email: string;
  name: string;
  password: string;
  guestCookie?: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
  cart?: unknown[];
  pdfKeys?: string[];
  addressBook?: UserAddressBook;
  emailNotificationsEnabled?: boolean;
}

export interface PublicUser {
  email: string;
  name: string;
  cart: unknown[];
  pdfKeys: string[];
}

export interface UserProfile {
  user: UserProfileDetails;
  orders: OrderRecord[];
  purchasedPatterns: PurchasedPatternDownload[];
}

export interface AdminUserStats {
  orderCount: number;
  totalSpent: number;
  refundedTotal: number;
  purchasedPatternCount: number;
  cartItemCount: number;
}

export interface AdminUserAccount {
  user: UserProfileDetails & { createdAt?: Date | string; updatedAt?: Date | string };
  orders: OrderRecord[];
  purchasedPatterns: PurchasedPatternDownload[];
  stats: AdminUserStats;
}

export interface AdminUpdateUserInput {
  name?: string;
  addressBook?: UserAddressBook;
  emailNotificationsEnabled?: boolean;
  password?: string;
}

export interface AdminRefundOrderInput {
  amount?: number;
  reason?: string;
}


export interface AccessResult {
  user: PublicUser;
  cookie: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginResult {
  admin: { email: string; name: string };
  cookie: string;
}

export interface AccessRuntime {
  randomBytes?: (size: number) => string | Uint8Array;
  randomUUID?: () => string;
  now?: () => Date;
}

export interface CartItemInput {
  productId: string;
  quantity?: number;
  colorVariation?: string;
  selectedColor?: string;
  selectedSize?: ProductSize;
  clientInstructions?: string;
}

export interface UpdateCartItemInput {
  quantity?: number;
  colorVariation?: string;
  selectedColor?: string;
  selectedSize?: ProductSize;
  clientInstructions?: string;
}

export interface CartLineItemSnapshot {
  itemId: string;
  productId: string;
  productType: ProductType;
  title: string;
  thumbnailImage: string;
  quantity: number;
  unitPrice: number;
  regularUnitPrice: number;
  salePrice?: number;
  lineTotal: number;
  selectedColor?: string;
  selectedSize?: ProductSize;
  clientInstructions: string;
}

export interface CartSnapshot {
  items: CartLineItemSnapshot[];
  subtotal: number;
  containsPatterns: boolean;
  guestCheckoutAllowed: boolean;
}

export interface CheckoutAddress {
  country: string;
  state?: string;
  postalCode?: string;
}

export interface CheckoutEstimateRequest {
  shippingAddress: CheckoutAddress;
  billingAddress?: CheckoutAddress;
}

export interface CheckoutEstimateResponse {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  grandTotal: number;
  currency: 'USD';
}

export interface CartResult {
  cookie: string;
  cart: CartItemInput[];
  cookieName: 'session_cookie' | 'client_cookie';
}

export interface MariaDbServiceLike {
  initialize(): Promise<void>;
  close(): Promise<void>;
  insertAdmin(input: InsertAdminInput): Promise<AdminRecord>;
  findAdminByEmail(email: string): Promise<AdminRecord | null>;
  insertUser(input: InsertUserInput): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  listUsers(): Promise<UserRecord[]>;
  updateUser(email: string, patch: UserPatch): Promise<UserRecord>;
  deleteUser(email: string): Promise<void>;
  upsertCookie(email: string, cookie: string, kind?: CookieKind, expiresAt?: Date): Promise<void>;
  findCookie(cookie: string): Promise<CookieRecord | null>;
  deleteCookie(cookie: string): Promise<void>;
  touchCookie(cookie: string, expiresAt: Date): Promise<void>;
  deleteExpiredCookies(now: Date): Promise<void>;
  upsertGuestCart(guestCookie: string, cart: unknown[], expiresAt?: Date): Promise<GuestRecord>;
  findGuestByCookie(guestCookie: string): Promise<GuestRecord | null>;
  deleteGuest(guestCookie: string): Promise<void>;
  touchGuest(guestCookie: string, expiresAt: Date): Promise<void>;
  deleteExpiredGuests(now: Date): Promise<void>;
  insertProduct(input: CreateProductInput & { id: string }): Promise<Product>;
  findProductById(productId: string): Promise<Product | null>;
  listProducts(productType?: ProductType, includeUnavailable?: boolean, sort?: ProductSortKey, direction?: ProductSortDirection): Promise<Product[]>;
  updateProduct(productId: string, patch: UpdateProductInput): Promise<Product>;
  removeProduct(productId: string): Promise<void>;
  insertOrder(input: InsertOrderInput): Promise<OrderRecord>;
  findOrderByIdempotencyKey(idempotencyKey: CheckoutIdempotencyKey): Promise<OrderRecord | null>;
  insertPurchasedPattern(input: InsertPurchasedPatternInput): Promise<PurchasedPatternRecord>;
  listPurchasedPatternsForUser(email: string): Promise<PurchasedPatternRecord[]>;
  findPurchasedPatternForUser(email: string, productId: string): Promise<PurchasedPatternRecord | null>;
  listOrdersForUser(email: string): Promise<OrderRecord[]>;
  listOrders(): Promise<OrderRecord[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderRecord>;
  listMarketEvents(now?: Date): Promise<MarketEvent[]>;
  getNextMarketEvent(now?: Date): Promise<MarketEvent | null>;
  insertMarketEvent(input: CreateMarketEventInput & { id: string }): Promise<MarketEvent>;
  updateMarketEvent(eventId: string, patch: UpdateMarketEventInput): Promise<MarketEvent>;
  deleteMarketEvent(eventId: string): Promise<void>;
  listBlogCollections(): Promise<BlogCollectionRecord[]>;
  insertBlogCollection(input: CreateBlogCollectionInput & { tag: string }): Promise<BlogCollectionRecord>;
  updateBlogCollection(tag: string, patch: UpdateBlogCollectionInput): Promise<BlogCollectionRecord>;
  deleteBlogCollection(tag: string): Promise<void>;
  listBlogArticles(): Promise<BlogArticleRecord[]>;
  insertBlogArticle(input: CreateBlogArticleInput & { articleId: string }): Promise<BlogArticleRecord>;
  updateBlogArticle(articleId: string, patch: UpdateBlogArticleInput): Promise<BlogArticleRecord>;
  deleteBlogArticle(articleId: string): Promise<void>;
}

export interface MariaDbAccess {
  checkUserPassword(email: string, password: string): Promise<boolean>;
  loginUser(input: UserLoginInput): Promise<AccessResult>;
  addUser(userData: AddUserInput): Promise<AccessResult>;
  getSession(cookies: { sessionCookie?: string; clientCookie?: string }): Promise<ClientSessionState>;
  logoutUser(clientCookie?: string): Promise<void>;
  getUser(email: string, cookie: string): Promise<UserProfile>;
  updateUser(userData: UpdateUserInput, email: string, cookie: string): Promise<PublicUser>;
  deleteUser(email: string, cookie: string): Promise<void>;
  listAdminUsers(adminCookie: string): Promise<AdminUserAccount[]>;
  updateAdminUser(adminCookie: string, email: string, input: AdminUpdateUserInput): Promise<AdminUserAccount>;
  deleteAdminUser(adminCookie: string, email: string): Promise<void>;
  refundOrder(adminCookie: string, orderId: string, input: AdminRefundOrderInput): Promise<OrderRecord>;
  getOrders(adminCookie: string): Promise<OrderRecord[]>;
  updateOrderStatus(adminCookie: string, orderId: string, status: OrderStatus): Promise<OrderRecord>;
  getServiceHealth(adminCookie: string): Promise<ServiceHealthReport>;
  newCookie(email: string, cookie?: string, kind?: CookieKind): Promise<string>;
  checkedout(email: string, cookie: string, paidAmount: number): Promise<OrderRecord[]>;
  adminLogin(input: AdminLoginInput): Promise<AdminLoginResult>;
  addProduct(adminCookie: string, productDTO: CreateProductInput): Promise<Product>;
  listAdminProducts(adminCookie: string): Promise<Product[]>;
  editProduct(adminCookie: string, productId: string, productDTO: UpdateProductInput): Promise<Product>;
  removeProduct(adminCookie: string, productId: string): Promise<void>;
  listBlogCollections(adminCookie: string): Promise<BlogCollectionRecord[]>;
  createBlogCollection(adminCookie: string, input: CreateBlogCollectionInput): Promise<BlogCollectionRecord>;
  updateBlogCollection(adminCookie: string, tag: string, input: UpdateBlogCollectionInput): Promise<BlogCollectionRecord>;
  deleteBlogCollection(adminCookie: string, tag: string): Promise<void>;
  listBlogArticles(adminCookie: string): Promise<BlogArticleRecord[]>;
  listPublicBlogCollections(): Promise<BlogCollectionRecord[]>;
  listPublishedBlogArticles(): Promise<BlogArticleRecord[]>;
  createBlogArticle(adminCookie: string, input: CreateBlogArticleInput): Promise<BlogArticleRecord>;
  updateBlogArticle(adminCookie: string, articleId: string, input: UpdateBlogArticleInput): Promise<BlogArticleRecord>;
  deleteBlogArticle(adminCookie: string, articleId: string): Promise<void>;
  listShopProducts(request: ShopProductBatchRequest): Promise<ShopProductBatchResponse>;
  listAvailableProductFilterOptions(): Promise<ShopProductFilterOptions>;
  listAvailableProductColors(): Promise<string[]>;
  listAvailableProductSizes(): Promise<ProductSize[]>;
  getCart(cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CartSnapshot>;
  addCartItem(input: CartItemInput, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CartResult>;
  updateCartItem(itemId: string, input: UpdateCartItemInput, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CartSnapshot>;
  removeCartItem(productId: string, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CartResult>;
  estimateCheckout(input: CheckoutEstimateRequest, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CheckoutEstimateResponse>;
  checkout(input: CheckoutRequest, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CheckoutResult>;
  listPurchasedPatterns(clientCookie: string): Promise<PurchasedPatternDownload[]>;
  createPurchasedPatternDownload(productId: string, clientCookie: string, signer: PatternDownloadSigner): Promise<PurchasedPatternDownload>;
  listMarketEvents(): Promise<MarketEventResponse>;
  getNextMarketEvent(): Promise<MarketEvent | null>;
  listAdminMarketEvents(adminCookie: string): Promise<MarketEvent[]>;
  createMarketEvent(adminCookie: string, input: CreateMarketEventInput): Promise<MarketEvent>;
  updateMarketEvent(adminCookie: string, eventId: string, input: UpdateMarketEventInput): Promise<MarketEvent>;
  deleteMarketEvent(adminCookie: string, eventId: string): Promise<void>;
}
