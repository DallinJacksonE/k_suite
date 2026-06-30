import { readFile } from 'node:fs/promises';
import { randomBytes as nodeRandomBytes, randomUUID as nodeRandomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { SESSION_TTL_MS } from '@k_suite/shared';
import type {
  AccessResult,
  AccessRuntime,
  AddUserInput,
  BlogArticleRecord,
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
  CreateProductInput,
  InsertOrderInput,
  MariaDbAccess,
  MariaDbServiceLike,
  OrderRecord,
  OrderStatus,
  Product,
  ProductSize,
  ProductSortDirection,
  ProductSortKey,
  ProductType,
  PublicUser,
  UpdateBlogArticleInput,
  UpdateCartItemInput,
  UpdateProductInput,
  UpdateUserInput,
  UserPatch,
  UserLoginInput,
  UserProfile,
  UserRecord,
  ServiceHealthReport,
  ShopProductBatchRequest,
  ShopProductBatchResponse,
} from '@k_suite/shared';

import { createMariaDbService } from './mariadb_service.js';
import { NoopEmailService, type EmailService } from '../email/EmailService.js';
import { createOrderEmailMessage } from '../email/OrderEmailTemplates.js';

export type { AccessResult, AccessRuntime, AddUserInput, AdminLoginInput, AdminLoginResult, BlogArticleRecord, CartItemInput, CartResult, CartSnapshot, CheckoutEstimateRequest, CheckoutEstimateResponse, CheckoutRequest, CheckoutResult, ClientSessionState, CreateBlogArticleInput, MariaDbAccess, PublicUser, ServiceHealthReport, UpdateBlogArticleInput, UpdateUserInput, UserLoginInput, UserProfile };

const scryptAsync = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;
const defaultService = createMariaDbService();

interface BackendConfig { admin: { name: string; email: string; password: string } }
type BackendAccessRuntime = AccessRuntime & { emailService?: EmailService };

export function createMariaDbAccess(service: MariaDbServiceLike = defaultService, runtime: BackendAccessRuntime = {}): MariaDbAccess {
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
    getServiceHealth: (adminCookie) => getServiceHealth(adminCookie, service),
    newCookie: (email, cookie, kind) => newCookie(email, cookie, kind, service, runtime),
    checkedout: (email, cookie, paidAmount) => checkedout(email, cookie, paidAmount, service, runtime),
    adminLogin: (input) => adminLogin(input, service, runtime),
    addProduct: (adminCookie, productDTO) => addProduct(adminCookie, productDTO, service, runtime),
    listAdminProducts: (adminCookie) => listAdminProducts(adminCookie, service),
    editProduct: (adminCookie, productId, productDTO) => editProduct(adminCookie, productId, productDTO, service),
    removeProduct: (adminCookie, productId) => removeProduct(adminCookie, productId, service),
    listBlogArticles: (adminCookie) => listBlogArticles(adminCookie, service),
    createBlogArticle: (adminCookie, input) => createBlogArticle(adminCookie, input, service, runtime),
    updateBlogArticle: (adminCookie, articleId, input) => updateBlogArticle(adminCookie, articleId, input, service),
    deleteBlogArticle: (adminCookie, articleId) => deleteBlogArticle(adminCookie, articleId, service),
    listShopProducts: (request) => listShopProducts(request, service),
    getCart: (cookies) => getCart(cookies, service, runtime),
    addCartItem: (input, cookies) => addCartItem(input, cookies, service, runtime),
    updateCartItem: (itemId, input, cookies) => updateCartItem(itemId, input, cookies, service, runtime),
    removeCartItem: (productId, cookies) => removeCartItem(productId, cookies, service, runtime),
    estimateCheckout: (input, cookies) => estimateCheckout(input, cookies, service, runtime),
    checkout: (input, cookies) => checkout(input, cookies, service, runtime),
  };
}

export async function initializeMariaDbAccess(service: MariaDbServiceLike = defaultService): Promise<void> {
  await service.initialize();
  await bootstrapAdmin(service);
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
  return { user: toPublicUser(user), orders: await service.listOrdersForUser(user.email) };
}

export async function updateUser(userData: UpdateUserInput, email: string, cookie: string, service: MariaDbServiceLike = defaultService): Promise<PublicUser> {
  const user = await requireUserWithCookie(email, cookie, service, 'client');
  const patch: UserPatch = {};
  if (userData.name !== undefined) patch.name = userData.name;
  if (userData.cart !== undefined) patch.cart = userData.cart;
  if (userData.pdfKeys !== undefined) patch.pdfKeys = userData.pdfKeys;
  if (userData.password !== undefined) { const salt = createSalt(); patch.salt = salt; patch.passwordHash = await hashPassword(userData.password, salt); }
  return toPublicUser(await service.updateUser(user.email, patch));
}

export async function deleteUser(email: string, cookie: string, service: MariaDbServiceLike = defaultService): Promise<void> {
  const user = await requireUserWithCookie(email, cookie, service, 'client');
  await service.deleteUser(user.email);
}

export async function getOrders(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<OrderRecord[]> { await requireAdminCookie(adminCookie, service); return service.listOrders(); }
export async function updateOrderStatus(adminCookie: string, orderId: string, status: OrderStatus, service: MariaDbServiceLike = defaultService, runtime: BackendAccessRuntime = {}): Promise<OrderRecord> { await requireAdminCookie(adminCookie, service); assertValidOrderStatus(status); const order = await service.updateOrderStatus(orderId, status); await sendOrderStatusEmail(order, runtime); return order; }
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

export async function addProduct(adminCookie: string, productDTO: CreateProductInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<Product> {
  await requireAdminCookie(adminCookie, service);
  assertRequired(productDTO.title, 'title');
  return service.insertProduct({ ...productDTO, id: createUuid(runtime) });
}
export async function listAdminProducts(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<Product[]> { await requireAdminCookie(adminCookie, service); return service.listProducts(undefined, true); }
export async function editProduct(adminCookie: string, productId: string, productDTO: UpdateProductInput, service: MariaDbServiceLike = defaultService): Promise<Product> { await requireAdminCookie(adminCookie, service); return service.updateProduct(productId, productDTO); }
export async function removeProduct(adminCookie: string, productId: string, service: MariaDbServiceLike = defaultService): Promise<void> { await requireAdminCookie(adminCookie, service); await service.removeProduct(productId); }
export async function listBlogArticles(adminCookie: string, service: MariaDbServiceLike = defaultService): Promise<BlogArticleRecord[]> { await requireAdminCookie(adminCookie, service); return service.listBlogArticles(); }
export async function createBlogArticle(adminCookie: string, input: CreateBlogArticleInput, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<BlogArticleRecord> { await requireAdminCookie(adminCookie, service); validateBlogArticle(input); return service.insertBlogArticle({ ...input, articleId: createUuid(runtime), published: input.published ?? false }); }
export async function updateBlogArticle(adminCookie: string, articleId: string, input: UpdateBlogArticleInput, service: MariaDbServiceLike = defaultService): Promise<BlogArticleRecord> { await requireAdminCookie(adminCookie, service); if (input.blocks) validateBlogBlocks(input.blocks); return service.updateBlogArticle(articleId, input); }
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
  const order = await service.insertOrder({
    orderId: createUuid(runtime),
    idempotencyKey: input.idempotencyKey,
    productId: lineItems[0].productId,
    clientEmail: normalizeEmail(input.contact.email),
    details: {
      contact: { ...input.contact, email: normalizeEmail(input.contact.email) },
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      payment: { token: input.paymentToken, status: input.paymentStatus ?? 'pending' },
      totals,
      lineItems,
    },
    clientInstructions: lineItems.map((item) => item.clientInstructions).filter(Boolean).join('\n'),
    chargedAmount: totals.grandTotal,
    status: 'pending',
  });

  await target.save([]);
  await sendOrderEmail('order_created', order, runtime);
  return toCheckoutResult(order);
}

function matchesProductFilters(product: Product, filters: ShopProductBatchRequest['filters'] = {}): boolean {
  if (filters.saleOnly && !product.isSaleItem) return false;
  if (filters.size && !(product.sizes ?? []).includes(filters.size)) return false;
  if (filters.color && (product.type !== 'plushie' || !product.colorVariations.some((variation) => readColorName(variation).toLowerCase() === filters.color?.toLowerCase()))) return false;
  if (filters.tags?.length && !filters.tags.every((tag) => product.tags?.includes(tag))) return false;
  return true;
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
function timestamp(value: Date | string | undefined): number { return value ? new Date(value).getTime() : 0; }

async function requireUserWithCookie(email: string, cookie: string, service: MariaDbServiceLike, kind: CookieKind): Promise<UserRecord> {
  const normalizedEmail = normalizeEmail(email);
  const [user, cookieRecord] = await Promise.all([service.findUserByEmail(normalizedEmail), service.findCookie(cookie)]);
  if (!user || !cookieRecord || cookieRecord.email !== normalizedEmail || cookieRecord.kind !== kind || isExpired(cookieRecord.expiresAt, now())) throw new Error('Invalid or expired cookie.');
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
function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
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
async function getCartTarget(cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike, runtime: AccessRuntime): Promise<{ cookie: string; cookieName: 'session_cookie' | 'client_cookie'; cart: unknown[]; save: (cart: CartItem[]) => Promise<void> }> { if (cookies.clientCookie) { const cookieRecord = await service.findCookie(cookies.clientCookie); if (cookieRecord?.kind === 'client' && !isExpired(cookieRecord.expiresAt, now(runtime))) { const user = await service.findUserByEmail(cookieRecord.email); if (user) return { cookie: cookies.clientCookie, cookieName: 'client_cookie', cart: user.cart, save: async (cart) => { await service.updateUser(user.email, { cart }); await service.touchCookie(cookies.clientCookie!, expiresAt(runtime)); } }; } } const sessionCookie = cookies.sessionCookie ?? createCookie(runtime); const guest = await service.findGuestByCookie(sessionCookie); if (guest && isExpired(guest.expiresAt, now(runtime))) await service.deleteGuest(sessionCookie); return { cookie: sessionCookie, cookieName: 'session_cookie', cart: guest && !isExpired(guest.expiresAt, now(runtime)) ? guest.cart : [], save: async (cart) => { await service.upsertGuestCart(sessionCookie, cart, expiresAt(runtime)); } }; }
function assertValidOrderStatus(status: OrderStatus): void { if (!['pending', 'paid', 'fulfilled', 'shipped', 'cancelled'].includes(status)) throw new Error('Invalid order status.'); }
async function sendOrderStatusEmail(order: OrderRecord, runtime: BackendAccessRuntime): Promise<void> { if (order.status === 'fulfilled') await sendOrderEmail('order_fulfilled', order, runtime); if (order.status === 'shipped') await sendOrderEmail('order_shipped', order, runtime); if (order.status === 'cancelled') await sendOrderEmail('order_cancelled', order, runtime); }
async function sendOrderEmail(event: 'order_created' | 'order_fulfilled' | 'order_shipped' | 'order_cancelled', order: OrderRecord, runtime: BackendAccessRuntime): Promise<void> { await (runtime.emailService ?? new NoopEmailService()).send(createOrderEmailMessage(event, order)); }
function toCheckoutResult(order: OrderRecord): CheckoutResult { const totals = (order.details.totals ?? {}) as Partial<CheckoutResult['totals']>; return { orderId: order.orderId, status: order.status, totals: { subtotal: Number(totals.subtotal ?? 0), discountTotal: Number(totals.discountTotal ?? 0), shipping: Number(totals.shipping ?? 0), tax: Number(totals.tax ?? 0), grandTotal: Number(totals.grandTotal ?? order.chargedAmount) }, purchasedPatternDownloadsAvailable: order.status === 'paid' || order.status === 'fulfilled' || order.status === 'shipped' }; }
function validateBlogArticle(input: CreateBlogArticleInput): void { assertRequired(input.title, 'title'); assertRequired(input.slug, 'slug'); assertRequired(input.excerpt, 'excerpt'); validateBlogBlocks(input.blocks); }
function validateBlogBlocks(blocks: unknown): void { if (!Array.isArray(blocks)) throw new Error('Invalid blog blocks.'); for (const block of blocks) { if (!block || typeof block !== 'object' || !('type' in block)) throw new Error('Invalid blog block.'); } }
function roundCurrency(value: number): number { return Math.round(value * 100) / 100; }
function now(runtime: AccessRuntime = {}): Date { return runtime.now?.() ?? new Date(); }
function expiresAt(runtime: AccessRuntime = {}): Date { return new Date(now(runtime).getTime() + SESSION_TTL_MS); }
function isExpired(expiresAtValue: Date | string, reference: Date): boolean { return new Date(expiresAtValue).getTime() <= reference.getTime(); }
async function loadBackendConfig(): Promise<BackendConfig> { const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../config.json'); return JSON.parse(await readFile(configPath, 'utf8')) as BackendConfig; }
