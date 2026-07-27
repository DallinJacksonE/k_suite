import { readFile } from 'node:fs/promises';
import { randomBytes as nodeRandomBytes, randomUUID as nodeRandomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { DEFAULT_BLOG_COLLECTION_TAG, SESSION_TTL_MS } from '@k_suite/shared';
import type {
  AccessResult,
  AccessRuntime,
  AddUserInput,
  AdminRefundOrderInput,
  AdminUpdateUserInput,
  AdminUserAccount,
  BlogArticleRecord,
  BlogCollectionRecord,
  AdminLoginInput,
  AdminLoginResult,
  CartItemInput,
  CartSnapshot,
  CartResult,
  CheckoutEstimateRequest,
  CheckoutEstimateResponse,
  CheckoutRequest,
  CheckoutResult,
  ClientSessionState,
  CookieKind,
  CreateBlogArticleInput,
  CreateBlogCollectionInput,
  CreateMarketEventInput,
  CreateProductInput,
  InsertOrderInput,
  MariaDbAccess,
  MariaDbServiceLike,
  MarketEvent,
  MarketEventResponse,
  OrderRecord,
  OrderStatus,
  PatternDownloadSigner,
  Product,
  ProductSize,
  ProductSortDirection,
  ProductSortKey,
  ProductType,
  PurchasedPatternDownload,
  PurchasedPatternRecord,
  PublicUser,
  UpdateBlogArticleInput,
  UpdateBlogCollectionInput,
  UpdateCartItemInput,
  UpdateMarketEventInput,
  UpdateProductInput,
  UpdateUserInput,
  UserPatch,
  UserLoginInput,
  UserProfile,
  UserRecord,
  ServiceHealthReport,
  ShopProductBatchRequest,
  ShopProductBatchResponse,
  ShopProductFilterOptions,
} from '@k_suite/shared';

import { createMariaDbService } from './mariadb_service.js';
import { NoopEmailService, type EmailService } from '../email/EmailService.js';
import { createOrderEmailMessage } from '../email/OrderEmailTemplates.js';

export type { AccessResult, AccessRuntime, AddUserInput, AdminLoginInput, AdminLoginResult, BlogArticleRecord, BlogCollectionRecord, CartItemInput, CartResult, CartSnapshot, CheckoutEstimateRequest, CheckoutEstimateResponse, CheckoutRequest, CheckoutResult, ClientSessionState, CreateBlogArticleInput, CreateBlogCollectionInput, MariaDbAccess, PublicUser, PurchasedPatternDownload, ServiceHealthReport, UpdateBlogArticleInput, UpdateBlogCollectionInput, UpdateUserInput, UserLoginInput, UserProfile };

const scryptAsync = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;
const defaultService = createMariaDbService();
const productFilterOptionCaches = new WeakMap<MariaDbServiceLike, ProductFilterOptionCache>();

interface BackendConfig { admin: { name: string; email: string; password: string } }
interface CheckoutPaymentProcessor { charge(input: CheckoutPaymentInput): Promise<CheckoutPaymentResult> }
interface CheckoutPaymentInput { idempotencyKey: string; amount: number; currency: 'USD'; paymentToken?: string }
interface CheckoutPaymentResult { provider: 'test' | 'square'; status: 'paid' | 'failed'; transactionId?: string }
type BackendAccessRuntime = AccessRuntime & { emailService?: EmailService; paymentProcessor?: CheckoutPaymentProcessor };

export function createMariaDbAccess(service: MariaDbServiceLike = defaultService, runtime: BackendAccessRuntime = {}): MariaDbAccess {
  const productFilterOptionCache = getProductFilterOptionCache(service);
  return {
    checkUserPassword: (email, password) => checkUserPassword(email, password, service),
    loginUser: (input) => loginUser(input, service, runtime),
    addUser: (userData) => addUser(userData, service, runtime),
    getSession: (cookies) => getSession(cookies, service, runtime),
    logoutUser: (clientCookie) => logoutUser(clientCookie, service),
    getUser: (email, cookie) => getUser(email, cookie, service),
    updateUser: (userData, email, cookie) => updateUser(userData, email, cookie, service),
    deleteUser: (email, cookie) => deleteUser(email, cookie, service),
    getOrders: (adminCookie) => getOrders(adminCookie, service),
    updateOrderStatus: (adminCookie, orderId, status) => updateOrderStatus(adminCookie, orderId, status, service, runtime),
    listAdminUsers: (adminCookie) => listAdminUsers(adminCookie, service),
    updateAdminUser: (adminCookie, email, input) => updateAdminUser(adminCookie, email, input, service),
    deleteAdminUser: (adminCookie, email) => deleteAdminUser(adminCookie, email, service),
    refundOrder: (adminCookie, orderId, input) => refundOrder(adminCookie, orderId, input, service, runtime),
    getServiceHealth: (adminCookie) => getServiceHealth(adminCookie, service),
    newCookie: (email, cookie, kind) => newCookie(email, cookie, kind, service, runtime),
    checkedout: (email, cookie, paidAmount) => checkedout(email, cookie, paidAmount, service, runtime),
    adminLogin: (input) => adminLogin(input, service, runtime),
    addProduct: (adminCookie, productDTO) => addProduct(adminCookie, productDTO, service, runtime, productFilterOptionCache),
    listAdminProducts: (adminCookie) => listAdminProducts(adminCookie, service),
    editProduct: (adminCookie, productId, productDTO) => editProduct(adminCookie, productId, productDTO, service),
    removeProduct: (adminCookie, productId) => removeProduct(adminCookie, productId, service),
    listBlogCollections: (adminCookie) => listBlogCollections(adminCookie, service),
    createBlogCollection: (adminCookie, input) => createBlogCollection(adminCookie, input, service),
    updateBlogCollection: (adminCookie, tag, input) => updateBlogCollection(adminCookie, tag, input, service),
    deleteBlogCollection: (adminCookie, tag) => deleteBlogCollection(adminCookie, tag, service),
    listBlogArticles: (adminCookie) => listBlogArticles(adminCookie, service),
    listPublicBlogCollections: () => listPublicBlogCollections(service),
    listPublishedBlogArticles: () => listPublishedBlogArticles(service),
    createBlogArticle: (adminCookie, input) => createBlogArticle(adminCookie, input, service, runtime),
    updateBlogArticle: (adminCookie, articleId, input) => updateBlogArticle(adminCookie, articleId, input, service),
    deleteBlogArticle: (adminCookie, articleId) => deleteBlogArticle(adminCookie, articleId, service),
    listShopProducts: (request) => listShopProducts(request, service),
    listAvailableProductFilterOptions: () => productFilterOptionCache.list(),
    listAvailableProductColors: () => productFilterOptionCache.listColors(),
    listAvailableProductSizes: () => productFilterOptionCache.listSizes(),
    getCart: (cookies) => getCart(cookies, service, runtime),
    addCartItem: (input, cookies) => addCartItem(input, cookies, service, runtime),
    updateCartItem: (itemId, input, cookies) => updateCartItem(itemId, input, cookies, service, runtime),
    removeCartItem: (productId, cookies) => removeCartItem(productId, cookies, service, runtime),
    estimateCheckout: (input, cookies) => estimateCheckout(input, cookies, service, runtime),
    checkout: (input, cookies) => checkout(input, cookies, service, runtime),
    listPurchasedPatterns: (clientCookie) => listPurchasedPatterns(clientCookie, service),
    createPurchasedPatternDownload: (productId, clientCookie, signer) => createPurchasedPatternDownload(productId, clientCookie, signer, service),
    listMarketEvents: () => listMarketEvents(service),
    getNextMarketEvent: () => getNextMarketEvent(service),
    listAdminMarketEvents: (adminCookie) => listAdminMarketEvents(adminCookie, service),
    createMarketEvent: (adminCookie, input) => createMarketEvent(adminCookie, input, service, runtime),
    updateMarketEvent: (adminCookie, eventId, input) => updateMarketEvent(adminCookie, eventId, input, service),
    deleteMarketEvent: (adminCookie, eventId) => deleteMarketEvent(adminCookie, eventId, service),
  };
}

export async function initializeMariaDbAccess(service: MariaDbServiceLike = defaultService): Promise<void> {
  await service.initialize();
  await bootstrapAdmin(service);
  await recalculateAvailableProductFilterOptions(service);
}
export async function closeMariaDbAccess(service: MariaDbServiceLike = defaultService): Promise<void> { await service.close(); }

export async function bootstrapAdmin(service: MariaDbServiceLike = defaultService, config = loadBackendConfig): Promise<void> {
  const { admin } = await config();
  const salt = createSalt();
  await service.insertAdmin({ email: normalizeEmail(admin.email), name: admin.name, passwordHash: await hashPassword(admin.password, salt), salt });
}

export async function adminLogin(input: AdminLoginInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<AdminLoginResult> {
  const email = normalizeEmail(input.email);
  const admin = await service.findAdminByEmail(email);
  if (!admin || !(await verifyPassword(input.password, admin.salt, admin.passwordHash))) throw new Error('Invalid admin credentials.');
  const cookie = await createAndStoreCookie(email, 'admin', service, runtime);
  return { admin: { email: admin.email, name: admin.name }, cookie };
}

export async function checkUserPassword(email: string, password: string, service: MariaDbServiceLike = defaultService): Promise<boolean> {
  const user = await service.findUserByEmail(normalizeEmail(email));
  return !!user && verifyPassword(password, user.salt, user.passwordHash);
}

export async function loginUser(input: UserLoginInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<AccessResult> {
  const email = normalizeEmail(input.email);
  const user = await service.findUserByEmail(email);
  if (!user || !(await verifyPassword(input.password, user.salt, user.passwordHash))) throw new Error('Invalid user credentials.');
  return { user: toPublicUser(user), cookie: await createAndStoreCookie(email, 'client', service, runtime) };
}

export async function addUser(userData: AddUserInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<AccessResult> {
  const email = normalizeEmail(userData.email);
  assertRequired(email, 'email'); assertRequired(userData.name, 'name'); assertRequired(userData.password, 'password');
  if (await service.findUserByEmail(email)) throw new Error('Email is already in use.');
  const salt = createSalt(runtime);
  const guestCart = userData.guestCookie ? (await service.findGuestByCookie(userData.guestCookie))?.cart ?? [] : [];
  const user = await service.insertUser({ email, name: userData.name, passwordHash: await hashPassword(userData.password, salt), salt, cart: guestCart, pdfKeys: [] });
  if (userData.guestCookie) await service.deleteGuest(userData.guestCookie);
  return { user: toPublicUser(user), cookie: await createAndStoreCookie(email, 'client', service, runtime) };
}

export async function getSession(cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<ClientSessionState> {
  if (cookies.clientCookie) {
    const cookieRecord = await service.findCookie(cookies.clientCookie);
    if (cookieRecord?.kind === 'client' && !isExpired(cookieRecord.expiresAt, now(runtime))) {
      const user = await service.findUserByEmail(cookieRecord.email);
      if (user) {
        await service.touchCookie(cookies.clientCookie, expiresAt(runtime));
        return { status: 'authenticated', user: toPublicUser(user) };
      }
    }
  }

  if (cookies.sessionCookie) {
    const guest = await service.findGuestByCookie(cookies.sessionCookie);
    if (guest && isExpired(guest.expiresAt, now(runtime))) await service.deleteGuest(cookies.sessionCookie);
    else if (guest) await service.touchGuest(cookies.sessionCookie, expiresAt(runtime));
  }

  return { status: 'guest' };
}

export async function logoutUser(clientCookie: string | undefined, service: MariaDbServiceLike = defaultService): Promise<void> {
  if (clientCookie) await service.deleteCookie(clientCookie);
}

export async function getUser(email: string, cookie: string, service: MariaDbServiceLike = defaultService): Promise<UserProfile> {
  const user = await requireUserWithCookie(email, cookie, service, 'client');
  return { user: toProfileUser(user), orders: await service.listOrdersForUser(user.email), purchasedPatterns: await toPurchasedPatternDownloads(await service.listPurchasedPatternsForUser(user.email), service) };
}

export async function updateUser(userData: UpdateUserInput, email: string, cookie: string, service: MariaDbServiceLike = defaultService): Promise<PublicUser> {
  const user = await requireUserWithCookie(email, cookie, service, 'client');
  const patch: UserPatch = {};
  if (userData.name !== undefined) patch.name = userData.name;
  if (userData.cart !== undefined) patch.cart = userData.cart;
  if (userData.pdfKeys !== undefined) patch.pdfKeys = userData.pdfKeys;
  if (userData.addressBook !== undefined) patch.addressBook = userData.addressBook;
  if (userData.emailNotificationsEnabled !== undefined) patch.emailNotificationsEnabled = userData.emailNotificationsEnabled;
  if (userData.password !== undefined) { const salt = createSalt(); patch.salt = salt; patch.passwordHash = await hashPassword(userData.password, salt); }
  return toPublicUser(await service.updateUser(user.email, patch));
}

export async function deleteUser(email: string, cookie: string, service: MariaDbServiceLike = defaultService): Promise<void> {
  const user = await requireUserWithCookie(email, cookie, service, 'client');
  await service.deleteUser(user.email);
}

export async function listAdminUsers(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<AdminUserAccount[]> {
  await requireAdminCookie(adminCookie, service);
  return Promise.all((await service.listUsers()).map((user) => toAdminUserAccount(user, service)));
}

export async function updateAdminUser(adminCookie: string, email: string, input: AdminUpdateUserInput, service: MariaDbServiceLike = defaultService): Promise<AdminUserAccount> {
  await requireAdminCookie(adminCookie, service);
  const patch: UserPatch = {};
  if (input.name !== undefined) patch.name = requireText(input.name, 'name');
  if (input.addressBook !== undefined) patch.addressBook = input.addressBook;
  if (input.emailNotificationsEnabled !== undefined) patch.emailNotificationsEnabled = input.emailNotificationsEnabled;
  if (input.password !== undefined) { const salt = createSalt(); patch.salt = salt; patch.passwordHash = await hashPassword(requireText(input.password, 'password'), salt); }
  return toAdminUserAccount(await service.updateUser(normalizeEmail(email), patch), service);
}

export async function deleteAdminUser(adminCookie: string, email: string, service: MariaDbServiceLike = defaultService): Promise<void> {
  await requireAdminCookie(adminCookie, service);
  await service.deleteUser(normalizeEmail(email));
}

export async function refundOrder(adminCookie: string, orderId: string, input: AdminRefundOrderInput, service: MariaDbServiceLike = defaultService, runtime: BackendAccessRuntime = {}): Promise<OrderRecord> {
  await requireAdminCookie(adminCookie, service);
  const order = await service.updateOrderStatus(orderId, 'refunded');
  await sendOrderStatusEmail(order, runtime);
  return { ...order, details: { ...order.details, refund: { amount: input.amount ?? order.chargedAmount, reason: optionalText(input.reason), refundedAt: now(runtime).toISOString() } } };
}

export async function getOrders(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<OrderRecord[]> { await requireAdminCookie(adminCookie, service); return service.listOrders(); }
export async function updateOrderStatus(adminCookie: string, orderId: string, status: OrderStatus, service: MariaDbServiceLike = defaultService, runtime: BackendAccessRuntime = {}): Promise<OrderRecord> { await requireAdminCookie(adminCookie, service); assertValidOrderStatus(status); const order = await service.updateOrderStatus(orderId, status); if (status === 'paid' || status === 'fulfilled' || status === 'shipped') await grantPurchasedPatterns(order, service); await sendOrderStatusEmail(order, runtime); return order; }
export async function getServiceHealth(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<ServiceHealthReport> { await requireAdminCookie(adminCookie, service); const checks = [{ name: 'database', status: 'ok' as const }, { name: 'objectStorage', status: 'ok' as const }]; return { status: checks.every((check) => check.status === 'ok') ? 'ok' : 'degraded', checkedAt: new Date().toISOString(), services: checks }; }

export async function newCookie(email: string, oldCookie?: string, kind: CookieKind = 'client', service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  if (kind === 'admin') { if (!await service.findAdminByEmail(normalizedEmail)) throw new Error(`Admin not found: ${normalizedEmail}`); }
  else { if (!await service.findUserByEmail(normalizedEmail)) throw new Error(`User not found: ${normalizedEmail}`); }
  if (oldCookie) await service.deleteCookie(oldCookie);
  return createAndStoreCookie(normalizedEmail, kind, service, runtime);
}

export async function checkedout(email: string, cookie: string, paidAmount: number, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<OrderRecord[]> {
  const user = await requireUserWithCookie(email, cookie, service, 'client');
  const cartItems = normalizeCart(user.cart);
  if (!cartItems.length) return [];
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const orders: OrderRecord[] = [];
  for (const item of cartItems) {
    const product = await service.findProductById(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    const orderInput: InsertOrderInput = { orderId: createUuid(runtime), productId: item.productId, clientEmail: user.email, details: { productType: product.type, quantity: item.quantity, colorVariation: item.colorVariation, productSnapshot: product }, clientInstructions: item.clientInstructions, chargedAmount: roundCurrency((paidAmount * item.quantity) / totalQuantity), status: 'pending' };
    orders.push(await service.insertOrder(orderInput));
  }
  await service.updateUser(user.email, { cart: [] });
  return orders;
}

export async function addProduct(adminCookie: string, productDTO: CreateProductInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}, productFilterOptionCache = getProductFilterOptionCache(service)): Promise<Product> {
  await requireAdminCookie(adminCookie, service);
  assertRequired(productDTO.title, 'title');
  const product = await service.insertProduct({ ...productDTO, id: createUuid(runtime) });
  await productFilterOptionCache.recalculate();
  return product;
}
export async function listAdminProducts(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<Product[]> { await requireAdminCookie(adminCookie, service); return service.listProducts(undefined, true); }
export async function editProduct(adminCookie: string, productId: string, productDTO: UpdateProductInput, service: MariaDbServiceLike = defaultService): Promise<Product> { await requireAdminCookie(adminCookie, service); return service.updateProduct(productId, productDTO); }
export async function removeProduct(adminCookie: string, productId: string, service: MariaDbServiceLike = defaultService): Promise<void> { await requireAdminCookie(adminCookie, service); await service.removeProduct(productId); }
export async function listBlogCollections(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<BlogCollectionRecord[]> { await requireAdminCookie(adminCookie, service); return service.listBlogCollections(); }
export async function createBlogCollection(adminCookie: string, input: CreateBlogCollectionInput, service: MariaDbServiceLike = defaultService): Promise<BlogCollectionRecord> { await requireAdminCookie(adminCookie, service); const label = requireText(input.label, 'collection label'); const tag = normalizeBlogCollectionTag(input.tag ?? label) || normalizeBlogCollectionTag(label); return service.insertBlogCollection({ ...input, tag, label, description: optionalText(input.description) }); }
export async function updateBlogCollection(adminCookie: string, tag: string, input: UpdateBlogCollectionInput, service: MariaDbServiceLike = defaultService): Promise<BlogCollectionRecord> { await requireAdminCookie(adminCookie, service); const currentTag = normalizeBlogCollectionTag(tag); if (currentTag === DEFAULT_BLOG_COLLECTION_TAG && input.tag && normalizeBlogCollectionTag(input.tag) !== DEFAULT_BLOG_COLLECTION_TAG) throw new Error('Default blog collection tag cannot be changed.'); return service.updateBlogCollection(currentTag, { tag: input.tag === undefined ? undefined : normalizeBlogCollectionTag(input.tag), label: input.label === undefined ? undefined : requireText(input.label, 'collection label'), description: input.description === undefined ? undefined : optionalText(input.description) }); }
export async function deleteBlogCollection(adminCookie: string, tag: string, service: MariaDbServiceLike = defaultService): Promise<void> { await requireAdminCookie(adminCookie, service); const normalized = normalizeBlogCollectionTag(tag); if (normalized === DEFAULT_BLOG_COLLECTION_TAG) throw new Error('Default blog collection cannot be deleted.'); await service.deleteBlogCollection(normalized); }
export async function listBlogArticles(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<BlogArticleRecord[]> { await requireAdminCookie(adminCookie, service); return service.listBlogArticles(); }
export async function listPublicBlogCollections(service: MariaDbServiceLike = defaultService): Promise<BlogCollectionRecord[]> { return service.listBlogCollections(); }
export async function listPublishedBlogArticles(service: MariaDbServiceLike = defaultService): Promise<BlogArticleRecord[]> { return (await service.listBlogArticles()).filter((article) => article.published); }
export async function createBlogArticle(adminCookie: string, input: CreateBlogArticleInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<BlogArticleRecord> { await requireAdminCookie(adminCookie, service); validateBlogArticle(input); return service.insertBlogArticle({ ...input, articleId: createUuid(runtime), collectionTags: normalizeBlogCollectionTags(input.collectionTags), published: input.published ?? false }); }
export async function updateBlogArticle(adminCookie: string, articleId: string, input: UpdateBlogArticleInput, service: MariaDbServiceLike = defaultService): Promise<BlogArticleRecord> { await requireAdminCookie(adminCookie, service); if (input.blocks) validateBlogBlocks(input.blocks); return service.updateBlogArticle(articleId, { ...input, collectionTags: input.collectionTags === undefined ? undefined : normalizeBlogCollectionTags(input.collectionTags) }); }
export async function deleteBlogArticle(adminCookie: string, articleId: string, service: MariaDbServiceLike = defaultService): Promise<void> { await requireAdminCookie(adminCookie, service); await service.deleteBlogArticle(articleId); }

export async function listShopProducts(request: ShopProductBatchRequest, service: MariaDbServiceLike = defaultService): Promise<ShopProductBatchResponse> {
  const filters = request.filters ?? {};
  const productType = filters.type === 'all' ? undefined : filters.type;
  const batchSize = request.batchSize ?? 20;
  const sorted = applyProductSort(await service.listProducts(productType, false), request.sort ?? 'createdAt', request.direction ?? 'desc');
  const filtered = sorted.filter((product) => matchesProductFilters(product, filters));
  const startIndex = request.afterId ? filtered.findIndex((product) => product.id === request.afterId) + 1 : 0;
  const safeStart = Math.max(0, startIndex);
  const products = filtered.slice(safeStart, safeStart + batchSize);
  const nextCursor = products.at(-1)?.id;
  return { products, nextCursor, hasMore: safeStart + batchSize < filtered.length, appliedFilters: filters };
}

export async function recalculateAvailableProductFilterOptions(service: MariaDbServiceLike = defaultService): Promise<ShopProductFilterOptions> {
  return getProductFilterOptionCache(service).recalculate();
}

export async function listAvailableProductFilterOptions(service: MariaDbServiceLike = defaultService): Promise<ShopProductFilterOptions> {
  return getProductFilterOptionCache(service).list();
}

export async function listAvailableProductColors(service: MariaDbServiceLike = defaultService): Promise<string[]> {
  return getProductFilterOptionCache(service).listColors();
}

export async function listAvailableProductSizes(service: MariaDbServiceLike = defaultService): Promise<ProductSize[]> {
  return getProductFilterOptionCache(service).listSizes();
}

export async function getCart(cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CartSnapshot> {
  const target = await getCartTarget(cookies, service, runtime);
  const cart = normalizeCart(target.cart);
  await target.save(cart);
  return await toCartSnapshot(cart, target.cookieName === 'client_cookie', service);
}

export async function addCartItem(input: CartItemInput, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CartResult> {
  const item = normalizeCartItem(input);
  const product = await service.findProductById(item.productId);
  if (!product) throw new Error(`Product not found: ${item.productId}`);
  if (product.inventoryCount !== undefined && product.inventoryCount < item.quantity) throw new Error('Product is out of stock.');
  if (product.type === 'pattern' && !cookies.clientCookie) throw new Error('Login required to purchase patterns.');
  const target = await getCartTarget(cookies, service, runtime);
  const cart = mergeCartItem(target.cart, item);
  await target.save(cart);
  return { cookie: target.cookie, cookieName: target.cookieName, cart };
}

export async function updateCartItem(itemId: string, input: UpdateCartItemInput, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CartSnapshot> {
  const target = await getCartTarget(cookies, service, runtime);
  const cart = normalizeCart(target.cart).map((item) => itemIdForCartItem(item) === itemId ? normalizeCartItem({ ...item, ...input }) : item);
  await target.save(cart);
  return await toCartSnapshot(cart, target.cookieName === 'client_cookie', service);
}

export async function removeCartItem(productId: string, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CartResult> {
  const target = await getCartTarget(cookies, service, runtime);
  const cart = normalizeCart(target.cart).filter((item) => item.productId !== productId && itemIdForCartItem(item) !== productId);
  await target.save(cart);
  return { cookie: target.cookie, cookieName: target.cookieName, cart };
}

export async function estimateCheckout(input: CheckoutEstimateRequest, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CheckoutEstimateResponse> {
  assertRequired(input.shippingAddress?.country ?? '', 'shippingAddress.country');
  const snapshot = await getCart(cookies, service, runtime);
  if (!snapshot.items.length) throw new Error('Cart is empty.');
  if (!snapshot.guestCheckoutAllowed) throw new Error('Please log in to check out with patterns.');
  const shipping = snapshot.subtotal >= 8_000 ? 0 : 800;
  const tax = Math.round(snapshot.subtotal * taxRateFor(input.shippingAddress.state));
  return { subtotal: snapshot.subtotal, shipping, tax, discount: 0, grandTotal: snapshot.subtotal + shipping + tax, currency: 'USD' };
}

export async function checkout(input: CheckoutRequest, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: BackendAccessRuntime = {}): Promise<CheckoutResult> {
  assertRequired(input.idempotencyKey, 'idempotencyKey');
  assertRequired(input.contact?.email ?? '', 'contact.email');
  assertRequired(input.contact?.name ?? '', 'contact.name');
  assertRequired(input.shippingAddress?.country ?? '', 'shippingAddress.country');
  assertRequired(input.billingAddress?.country ?? '', 'billingAddress.country');

  const existing = await service.findOrderByIdempotencyKey(input.idempotencyKey);
  if (existing) return toCheckoutResult(existing);

  const target = await getCartTarget(cookies, service, runtime);
  const cart = normalizeCart(target.cart);
  if (!cart.length) throw new Error('Cart is empty.');

  const lineItems = await Promise.all(cart.map((item) => toOrderLineItem(item, service)));
  const containsPatterns = lineItems.some((item) => item.productType === 'pattern');
  if (containsPatterns && target.cookieName !== 'client_cookie') throw new Error('Please log in to check out with patterns.');

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal >= 8_000 ? 0 : 800;
  const tax = Math.round(subtotal * taxRateFor(input.shippingAddress.region));
  const totals = { subtotal, discountTotal: 0, shipping, tax, grandTotal: subtotal + shipping + tax };
  const payment = await chargeCheckoutPayment({ idempotencyKey: input.idempotencyKey, amount: totals.grandTotal, currency: 'USD', paymentToken: input.paymentToken }, runtime);
  const order = await service.insertOrder({
    orderId: createUuid(runtime),
    idempotencyKey: input.idempotencyKey,
    productId: lineItems[0].productId,
    clientEmail: target.userEmail ?? normalizeEmail(input.contact.email),
    details: {
      contact: { ...input.contact, email: normalizeEmail(input.contact.email) },
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      payment: { provider: payment.provider, status: payment.status, transactionId: payment.transactionId, token: input.paymentToken },
      totals,
      lineItems,
    },
    clientInstructions: lineItems.map((item) => item.clientInstructions).filter(Boolean).join('\n'),
    chargedAmount: totals.grandTotal,
    status: payment.status === 'paid' ? 'paid' : 'pending',
  });

  await target.save([]);
  if (order.status === 'paid') await grantPurchasedPatterns(order, service);
  await sendOrderEmail('order_created', order, runtime);
  return toCheckoutResult(order);
}

export async function listPurchasedPatterns(clientCookie: string, service: MariaDbServiceLike = defaultService): Promise<PurchasedPatternDownload[]> {
  const user = await requireUserFromCookie(clientCookie, service, 'client');
  return toPurchasedPatternDownloads(await service.listPurchasedPatternsForUser(user.email), service);
}

export async function createPurchasedPatternDownload(productId: string, clientCookie: string, signer: PatternDownloadSigner, service: MariaDbServiceLike = defaultService): Promise<PurchasedPatternDownload> {
  const user = await requireUserFromCookie(clientCookie, service, 'client');
  const purchase = await service.findPurchasedPatternForUser(user.email, productId);
  if (!purchase) throw new Error('Purchased pattern not found.');
  const [metadata, signed] = await Promise.all([toPurchasedPatternDownload(purchase, service), signer.signPatternPdf(purchase.pdfKey)]);
  return { ...metadata, downloadUrl: signed.url, expiresAt: signed.expiresAt };
}

export async function listMarketEvents(service: MariaDbServiceLike = defaultService): Promise<MarketEventResponse> {
  const events = await service.listMarketEvents();
  return { events, nextEvent: events[0] };
}

export async function getNextMarketEvent(service: MariaDbServiceLike = defaultService): Promise<MarketEvent | null> {
  return service.getNextMarketEvent();
}

export async function listAdminMarketEvents(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<MarketEvent[]> {
  await requireAdminCookie(adminCookie, service);
  return service.listMarketEvents(new Date(0));
}

export async function createMarketEvent(adminCookie: string, input: CreateMarketEventInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<MarketEvent> {
  await requireAdminCookie(adminCookie, service);
  validateMarketEvent(input);
  return service.insertMarketEvent({ ...input, id: createUuid(runtime) });
}

export async function updateMarketEvent(adminCookie: string, eventId: string, input: UpdateMarketEventInput, service: MariaDbServiceLike = defaultService): Promise<MarketEvent> {
  await requireAdminCookie(adminCookie, service);
  validateMarketEventPatch(input);
  return service.updateMarketEvent(eventId, input);
}

export async function deleteMarketEvent(adminCookie: string, eventId: string, service: MariaDbServiceLike = defaultService): Promise<void> {
  await requireAdminCookie(adminCookie, service);
  await service.deleteMarketEvent(eventId);
}

function matchesProductFilters(product: Product, filters: ShopProductBatchRequest['filters'] = {}): boolean {
  if (filters.saleOnly && !product.isSaleItem) return false;
  if (filters.size && !(product.sizes ?? []).includes(filters.size)) return false;
  if (filters.color && (product.type !== 'plushie' || !product.colorVariations.some((variation) => readColorName(variation).toLowerCase() === filters.color?.toLowerCase()))) return false;
  if (filters.tags?.length && !filters.tags.every((tag) => product.tags?.includes(tag))) return false;
  return true;
}

function getProductFilterOptionCache(service: MariaDbServiceLike): ProductFilterOptionCache {
  let cache = productFilterOptionCaches.get(service);
  if (!cache) {
    cache = new ProductFilterOptionCache(service);
    productFilterOptionCaches.set(service, cache);
  }
  return cache;
}

class ProductFilterOptionCache {
  private options: ShopProductFilterOptions = { colors: [], sizes: [] };

  constructor(private readonly service: MariaDbServiceLike) {}

  async recalculate(): Promise<ShopProductFilterOptions> {
    const colors = new Set<string>();
    const sizes = new Set<ProductSize>();
    for (const product of await this.service.listProducts(undefined, false)) {
      for (const size of product.sizes ?? []) sizes.add(size);
      if (product.type === 'plushie') {
        for (const variation of product.colorVariations) {
          const color = readColorName(variation).trim();
          if (color) colors.add(color);
        }
      }
    }
    this.options = { colors: sortText([...colors]), sizes: sortProductSizes([...sizes]) };
    return this.list();
  }

  async list(): Promise<ShopProductFilterOptions> {
    return { colors: [...this.options.colors], sizes: [...this.options.sizes] };
  }

  async listColors(): Promise<string[]> {
    return [...this.options.colors];
  }

  async listSizes(): Promise<ProductSize[]> {
    return [...this.options.sizes];
  }
}

function applyProductSort(products: Product[], sort: ProductSortKey, direction: ProductSortDirection): Product[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...products].sort((left, right) => {
    const value = compareSortValue(left, right, sort);
    return value === 0 ? left.id.localeCompare(right.id) : value * multiplier;
  });
}

function compareSortValue(left: Product, right: Product, sort: ProductSortKey): number {
  if (sort === 'price') return effectivePrice(left) - effectivePrice(right);
  if (sort === 'title') return left.title.localeCompare(right.title);
  return timestamp(left.createdAt) - timestamp(right.createdAt);
}

function effectivePrice(product: Product): number { return product.salePrice ?? product.price; }
function readColorName(variation: unknown): string { return typeof variation === 'string' ? variation : String((variation as { name?: unknown }).name ?? ''); }
function sortText(values: string[]): string[] { return values.sort((left, right) => left.localeCompare(right)); }
function sortProductSizes(values: ProductSize[]): ProductSize[] { const order = ['extra-small', 'small', 'medium', 'large', 'extra-large']; return values.sort((left, right) => order.indexOf(left) - order.indexOf(right)); }
function timestamp(value: Date | string | undefined): number { return value ? new Date(value).getTime() : 0; }

async function requireUserWithCookie(email: string, cookie: string, service: MariaDbServiceLike, kind: CookieKind): Promise<UserRecord> {
  const normalizedEmail = normalizeEmail(email);
  const [user, cookieRecord] = await Promise.all([service.findUserByEmail(normalizedEmail), service.findCookie(cookie)]);
  if (!user || !cookieRecord || cookieRecord.email !== normalizedEmail || cookieRecord.kind !== kind || isExpired(cookieRecord.expiresAt, now())) throw new Error('Invalid or expired cookie.');
  await service.touchCookie(cookie, expiresAt());
  return user;
}
async function requireUserFromCookie(cookie: string, service: MariaDbServiceLike, kind: CookieKind): Promise<UserRecord> {
  const cookieRecord = await service.findCookie(cookie);
  if (!cookieRecord || cookieRecord.kind !== kind || isExpired(cookieRecord.expiresAt, now())) throw new Error('Invalid or expired cookie.');
  const user = await service.findUserByEmail(cookieRecord.email);
  if (!user) throw new Error('Invalid or expired cookie.');
  await service.touchCookie(cookie, expiresAt());
  return user;
}
export async function requireAdminCookie(cookie: string, service: MariaDbServiceLike = defaultService): Promise<void> {
  const cookieRecord = await service.findCookie(cookie);
  if (!cookieRecord || cookieRecord.kind !== 'admin' || isExpired(cookieRecord.expiresAt, now()) || !(await service.findAdminByEmail(cookieRecord.email))) throw new Error('Admin access required.');
  await service.touchCookie(cookie, expiresAt());
}
async function createAndStoreCookie(email: string, kind: CookieKind, service: MariaDbServiceLike, runtime: AccessRuntime): Promise<string> { const cookie = createCookie(runtime); await service.upsertCookie(email, cookie, kind, expiresAt(runtime)); return cookie; }
async function hashPassword(password: string, salt: string): Promise<string> { return ((await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer).toString('hex'); }
async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> { const actual = Buffer.from(await hashPassword(password, salt), 'hex'); const expected = Buffer.from(expectedHash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
function toPublicUser(user: UserRecord): PublicUser { return { email: user.email, name: user.name, cart: user.cart, pdfKeys: user.pdfKeys }; }
function toProfileUser(user: UserRecord) { return { email: user.email, name: user.name, addressBook: user.addressBook, emailNotificationsEnabled: user.emailNotificationsEnabled }; }
function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
function requireText(value: string | undefined, field: string): string { const trimmed = value?.trim() ?? ''; if (!trimmed) throw new Error(`${field} is required.`); return trimmed; }
function optionalText(value: string | undefined): string | undefined { const trimmed = value?.trim(); return trimmed ? trimmed : undefined; }
function assertRequired(value: string, field: string): void { if (!value || value.trim().length === 0) throw new Error(`${field} is required.`); }
function createSalt(runtime: AccessRuntime = {}): string { return toToken(runtime.randomBytes?.(16) ?? nodeRandomBytes(16)); }
function createCookie(runtime: AccessRuntime = {}): string { return toToken(runtime.randomBytes?.(32) ?? nodeRandomBytes(32)); }
function createUuid(runtime: AccessRuntime = {}): string { return runtime.randomUUID?.() ?? nodeRandomUUID(); }
function toToken(value: string | Uint8Array): string { return typeof value === 'string' ? value : Buffer.from(value).toString('hex'); }
interface CartItem { productId: string; quantity: number; clientInstructions: string; colorVariation?: string; selectedColor?: string; selectedSize?: ProductSize }
function normalizeCart(cart: unknown[]): CartItem[] { return cart.map((item) => normalizeCartItem(item)); }
function normalizeCartItem(item: unknown): CartItem { if (!item || typeof item !== 'object') throw new Error('Invalid cart item.'); const record = item as Record<string, unknown>; const productId = String(record.productId ?? record.product_id ?? ''); if (!productId) throw new Error('Invalid cart item: productId is required.'); const quantity = Number(record.quantity ?? 1); if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid cart item: quantity must be positive.'); const colorVariation = record.colorVariation ?? record.selectedColor; const selectedSize = record.selectedSize; return { productId, quantity, clientInstructions: String(record.clientInstructions ?? record.client_instructions ?? ''), colorVariation: colorVariation === undefined ? undefined : String(colorVariation), selectedColor: colorVariation === undefined ? undefined : String(colorVariation), selectedSize: isProductSize(selectedSize) ? selectedSize : undefined }; }
function mergeCartItem(cart: unknown[], item: CartItem): CartItem[] { const normalized = normalizeCart(cart); const existing = normalized.find((cartItem) => itemIdForCartItem(cartItem) === itemIdForCartItem(item)); if (existing) existing.quantity += item.quantity; else normalized.push(item); return normalized; }
async function toCartSnapshot(cart: CartItem[], authenticated: boolean, service: MariaDbServiceLike): Promise<CartSnapshot> { const items = await Promise.all(cart.map((item) => toCartLineItem(item, service))); const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0); const containsPatterns = items.some((item) => item.productType === 'pattern'); return { items, subtotal, containsPatterns, guestCheckoutAllowed: authenticated || !containsPatterns }; }
async function toCartLineItem(item: CartItem, service: MariaDbServiceLike) { const product = await service.findProductById(item.productId); if (!product) throw new Error(`Product not found: ${item.productId}`); const unitPrice = effectivePrice(product); return { itemId: itemIdForCartItem(item), productId: item.productId, productType: product.type, title: product.title, thumbnailImage: product.thumbnailImage, quantity: item.quantity, unitPrice, regularUnitPrice: product.price, salePrice: product.salePrice, lineTotal: unitPrice * item.quantity, selectedColor: item.selectedColor ?? item.colorVariation, selectedSize: item.selectedSize, clientInstructions: item.clientInstructions }; }
async function toOrderLineItem(item: CartItem, service: MariaDbServiceLike) { const product = await service.findProductById(item.productId); if (!product || !product.available) throw new Error(`Product not found: ${item.productId}`); if (product.inventoryCount !== undefined && product.inventoryCount < item.quantity) throw new Error('Product is out of stock.'); const unitPrice = effectivePrice(product); return { productId: item.productId, productType: product.type, title: product.title, quantity: item.quantity, unitPrice, salePrice: product.salePrice, selectedColor: item.selectedColor ?? item.colorVariation, selectedSize: item.selectedSize, clientInstructions: item.clientInstructions, lineTotal: unitPrice * item.quantity, pdfKey: product.type === 'pattern' ? product.pdfKey : undefined }; }
function itemIdForCartItem(item: CartItem): string { return [item.productId, item.colorVariation ?? item.selectedColor ?? '', item.selectedSize ?? ''].join(':'); }
function isProductSize(value: unknown): value is ProductSize { return typeof value === 'string' && ['extra-small', 'small', 'medium', 'large', 'extra-large'].includes(value); }
function taxRateFor(state?: string): number { return state?.toUpperCase() === 'CA' ? 0.0825 : 0; }
async function getCartTarget(cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike, runtime: AccessRuntime): Promise<{ cookie: string; cookieName: 'session_cookie' | 'client_cookie'; cart: unknown[]; userEmail?: string; save: (cart: CartItem[]) => Promise<void> }> { if (cookies.clientCookie) { const cookieRecord = await service.findCookie(cookies.clientCookie); if (cookieRecord?.kind === 'client' && !isExpired(cookieRecord.expiresAt, now(runtime))) { const user = await service.findUserByEmail(cookieRecord.email); if (user) return { cookie: cookies.clientCookie, cookieName: 'client_cookie', cart: user.cart, userEmail: user.email, save: async (cart) => { await service.updateUser(user.email, { cart }); await service.touchCookie(cookies.clientCookie!, expiresAt(runtime)); } }; } } const sessionCookie = cookies.sessionCookie ?? createCookie(runtime); const guest = await service.findGuestByCookie(sessionCookie); if (guest && isExpired(guest.expiresAt, now(runtime))) await service.deleteGuest(sessionCookie); return { cookie: sessionCookie, cookieName: 'session_cookie', cart: guest && !isExpired(guest.expiresAt, now(runtime)) ? guest.cart : [], save: async (cart) => { await service.upsertGuestCart(sessionCookie, cart, expiresAt(runtime)); } }; }
function assertValidOrderStatus(status: OrderStatus): void { if (!['pending', 'paid', 'fulfilled', 'shipped', 'cancelled', 'refunded'].includes(status)) throw new Error('Invalid order status.'); }
async function sendOrderStatusEmail(order: OrderRecord, runtime: BackendAccessRuntime): Promise<void> { if (order.status === 'fulfilled') await sendOrderEmail('order_fulfilled', order, runtime); if (order.status === 'shipped') await sendOrderEmail('order_shipped', order, runtime); if (order.status === 'cancelled') await sendOrderEmail('order_cancelled', order, runtime); }
async function sendOrderEmail(event: 'order_created' | 'order_fulfilled' | 'order_shipped' | 'order_cancelled', order: OrderRecord, runtime: BackendAccessRuntime): Promise<void> { await (runtime.emailService ?? new NoopEmailService()).send(createOrderEmailMessage(event, order)); }
function toCheckoutResult(order: OrderRecord): CheckoutResult { const totals = (order.details.totals ?? {}) as Partial<CheckoutResult['totals']>; return { orderId: order.orderId, status: order.status, totals: { subtotal: Number(totals.subtotal ?? 0), discountTotal: Number(totals.discountTotal ?? 0), shipping: Number(totals.shipping ?? 0), tax: Number(totals.tax ?? 0), grandTotal: Number(totals.grandTotal ?? order.chargedAmount) }, purchasedPatternDownloadsAvailable: order.status === 'paid' || order.status === 'fulfilled' || order.status === 'shipped' }; }
async function chargeCheckoutPayment(input: CheckoutPaymentInput, runtime: BackendAccessRuntime): Promise<CheckoutPaymentResult> { return (runtime.paymentProcessor ?? createCheckoutPaymentProcessor()).charge(input); }
function createCheckoutPaymentProcessor(): CheckoutPaymentProcessor { return process.env.CHECKOUT_PAYMENT_PROVIDER === 'square' ? new SquareCheckoutPaymentProcessor() : new TestCheckoutPaymentProcessor(); }
class TestCheckoutPaymentProcessor implements CheckoutPaymentProcessor { async charge(input: CheckoutPaymentInput): Promise<CheckoutPaymentResult> { return { provider: 'test', status: 'paid', transactionId: `test-${input.idempotencyKey}` }; } }
export class SquareCheckoutPaymentProcessor implements CheckoutPaymentProcessor { constructor(private readonly config = readSquarePaymentConfig()) {} async charge(): Promise<CheckoutPaymentResult> { throw new Error(`Square payment capture is not implemented yet for ${this.config.environment}. Configure SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, and SQUARE_ACCESS_TOKEN before enabling it.`); } }
function readSquarePaymentConfig(): { applicationId?: string; locationId?: string; accessToken?: string; environment: string } { return { applicationId: process.env.SQUARE_APPLICATION_ID, locationId: process.env.SQUARE_LOCATION_ID, accessToken: process.env.SQUARE_ACCESS_TOKEN, environment: process.env.SQUARE_ENVIRONMENT ?? 'sandbox' }; }
async function grantPurchasedPatterns(order: OrderRecord, service: MariaDbServiceLike): Promise<void> { for (const item of orderLineItems(order)) { if (item.productType === 'pattern' && typeof item.productId === 'string' && typeof item.pdfKey === 'string' && item.pdfKey) await service.insertPurchasedPattern({ userEmail: order.clientEmail, productId: item.productId, orderId: order.orderId, pdfKey: item.pdfKey }); } }
function orderLineItems(order: OrderRecord): Array<Record<string, unknown>> { const lineItems = order.details.lineItems; return Array.isArray(lineItems) ? lineItems.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []; }
async function toPurchasedPatternDownloads(purchases: PurchasedPatternRecord[], service: MariaDbServiceLike): Promise<PurchasedPatternDownload[]> { return Promise.all(purchases.map((purchase) => toPurchasedPatternDownload(purchase, service))); }
async function toPurchasedPatternDownload(purchase: PurchasedPatternRecord, service: MariaDbServiceLike): Promise<PurchasedPatternDownload> { const product = await service.findProductById(purchase.productId); return { productId: purchase.productId, orderId: purchase.orderId, title: product?.title ?? 'Purchased pattern', purchasedAt: purchase.purchasedAt ?? new Date() }; }
async function toAdminUserAccount(user: UserRecord, service: MariaDbServiceLike): Promise<AdminUserAccount> { const orders = await service.listOrdersForUser(user.email); const purchasedPatterns = await toPurchasedPatternDownloads(await service.listPurchasedPatternsForUser(user.email), service); const refundedTotal = orders.filter((order) => order.status === 'refunded').reduce((sum, order) => sum + order.chargedAmount, 0); return { user: { ...toProfileUser(user), createdAt: user.createdAt, updatedAt: user.updatedAt }, orders, purchasedPatterns, stats: { orderCount: orders.length, totalSpent: orders.filter((order) => order.status !== 'cancelled' && order.status !== 'refunded').reduce((sum, order) => sum + order.chargedAmount, 0), refundedTotal, purchasedPatternCount: purchasedPatterns.length, cartItemCount: normalizeCart(user.cart).reduce((sum, item) => sum + item.quantity, 0) } }; }
function validateBlogArticle(input: CreateBlogArticleInput): void { assertRequired(input.title, 'title'); assertRequired(input.slug, 'slug'); assertRequired(input.excerpt, 'excerpt'); validateBlogBlocks(input.blocks); }
function validateBlogBlocks(blocks: unknown): void { if (!Array.isArray(blocks)) throw new Error('Invalid blog blocks.'); for (const block of blocks) { if (!block || typeof block !== 'object' || !('type' in block)) throw new Error('Invalid blog block.'); } }
function normalizeBlogCollectionTags(values: string[] | undefined): string[] { const tags = [...new Set((values ?? []).map(normalizeBlogCollectionTag).filter(Boolean))]; return tags.length ? tags : [DEFAULT_BLOG_COLLECTION_TAG]; }
function normalizeBlogCollectionTag(value: string): string { return value.trim().toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function validateMarketEvent(input: CreateMarketEventInput): void { assertRequired(input.title, 'title'); assertRequired(input.location, 'location'); if (input.address !== undefined) assertRequired(input.address, 'address'); assertValidDate(input.startsAt, 'startsAt'); if (input.endsAt !== undefined) assertValidDate(input.endsAt, 'endsAt'); }
function validateMarketEventPatch(input: UpdateMarketEventInput): void { if (input.title !== undefined) assertRequired(input.title, 'title'); if (input.location !== undefined) assertRequired(input.location, 'location'); if (input.address !== undefined) assertRequired(input.address, 'address'); if (input.startsAt !== undefined) assertValidDate(input.startsAt, 'startsAt'); if (input.endsAt !== undefined) assertValidDate(input.endsAt, 'endsAt'); }
function assertValidDate(value: Date | string, field: string): void { if (Number.isNaN(new Date(value).getTime())) throw new Error(`Invalid ${field}.`); }
function roundCurrency(value: number): number { return Math.round(value * 100) / 100; }
function now(runtime: AccessRuntime = {}): Date { return runtime.now?.() ?? new Date(); }
function expiresAt(runtime: AccessRuntime = {}): Date { return new Date(now(runtime).getTime() + SESSION_TTL_MS); }
function isExpired(expiresAtValue: Date | string, reference: Date): boolean { return new Date(expiresAtValue).getTime() <= reference.getTime(); }
async function loadBackendConfig(): Promise<BackendConfig> { const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../config.json'); return JSON.parse(await readFile(configPath, 'utf8')) as BackendConfig; }
