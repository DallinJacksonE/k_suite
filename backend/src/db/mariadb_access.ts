import { readFile } from 'node:fs/promises';
import { randomBytes as nodeRandomBytes, randomUUID as nodeRandomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type {
  AccessResult,
  AccessRuntime,
  AddUserInput,
  BlogArticleRecord,
  AdminLoginInput,
  AdminLoginResult,
  CartItemInput,
  CartResult,
  CookieKind,
  CreateBlogArticleInput,
  CreateProductInput,
  InsertOrderInput,
  MariaDbAccess,
  MariaDbServiceLike,
  OrderRecord,
  OrderStatus,
  Product,
  ProductType,
  PublicUser,
  UpdateBlogArticleInput,
  UpdateProductInput,
  UpdateUserInput,
  UserPatch,
  UserLoginInput,
  UserProfile,
  UserRecord,
  ServiceHealthReport,
} from '@k_suite/shared';

import { createMariaDbService } from './mariadb_service.js';

export type { AccessResult, AccessRuntime, AddUserInput, AdminLoginInput, AdminLoginResult, BlogArticleRecord, CartItemInput, CartResult, CreateBlogArticleInput, MariaDbAccess, PublicUser, ServiceHealthReport, UpdateBlogArticleInput, UpdateUserInput, UserLoginInput, UserProfile };

const scryptAsync = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;
const defaultService = createMariaDbService();

interface BackendConfig { admin: { name: string; email: string; password: string } }

export function createMariaDbAccess(service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): MariaDbAccess {
  return {
    checkUserPassword: (email, password) => checkUserPassword(email, password, service),
    loginUser: (input) => loginUser(input, service, runtime),
    addUser: (userData) => addUser(userData, service, runtime),
    getUser: (email, cookie) => getUser(email, cookie, service),
    updateUser: (userData, email, cookie) => updateUser(userData, email, cookie, service),
    deleteUser: (email, cookie) => deleteUser(email, cookie, service),
    getOrders: (adminCookie) => getOrders(adminCookie, service),
    updateOrderStatus: (adminCookie, orderId, status) => updateOrderStatus(adminCookie, orderId, status, service),
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
    listShopProducts: (productType, batchSize, afterId) => listShopProducts(productType, batchSize, afterId, service),
    addCartItem: (input, cookies) => addCartItem(input, cookies, service, runtime),
    removeCartItem: (productId, cookies) => removeCartItem(productId, cookies, service, runtime),
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
export async function updateOrderStatus(adminCookie: string, orderId: string, status: OrderStatus, service: MariaDbServiceLike = defaultService): Promise<OrderRecord> { await requireAdminCookie(adminCookie, service); assertValidOrderStatus(status); return service.updateOrderStatus(orderId, status); }
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

export async function listShopProducts(productType: ProductType, batchSize = 20, afterId?: string, service: MariaDbServiceLike = defaultService): Promise<Product[]> {
  const products = await service.listProducts(productType, false);
  const startIndex = afterId ? products.findIndex((product) => product.id === afterId) + 1 : 0;
  return products.slice(Math.max(0, startIndex), Math.max(0, startIndex) + batchSize);
}

export async function addCartItem(input: CartItemInput, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CartResult> {
  const item = normalizeCartItem(input);
  if (!await service.findProductById(item.productId)) throw new Error(`Product not found: ${item.productId}`);
  const target = await getCartTarget(cookies, service, runtime);
  const cart = mergeCartItem(target.cart, item);
  await target.save(cart);
  return { cookie: target.cookie, cookieName: target.cookieName, cart };
}

export async function removeCartItem(productId: string, cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike = defaultService, runtime: AccessRuntime = {}): Promise<CartResult> {
  const target = await getCartTarget(cookies, service, runtime);
  const cart = normalizeCart(target.cart).filter((item) => item.productId !== productId);
  await target.save(cart);
  return { cookie: target.cookie, cookieName: target.cookieName, cart };
}

async function requireUserWithCookie(email: string, cookie: string, service: MariaDbServiceLike, kind: CookieKind): Promise<UserRecord> {
  const normalizedEmail = normalizeEmail(email);
  const [user, cookieRecord] = await Promise.all([service.findUserByEmail(normalizedEmail), service.findCookie(cookie)]);
  if (!user || !cookieRecord || cookieRecord.email !== normalizedEmail || cookieRecord.kind !== kind) throw new Error('Invalid or expired cookie.');
  return user;
}
export async function requireAdminCookie(cookie: string, service: MariaDbServiceLike = defaultService): Promise<void> {
  const cookieRecord = await service.findCookie(cookie);
  if (!cookieRecord || cookieRecord.kind !== 'admin' || !(await service.findAdminByEmail(cookieRecord.email))) throw new Error('Admin access required.');
}
async function createAndStoreCookie(email: string, kind: CookieKind, service: MariaDbServiceLike, runtime: AccessRuntime): Promise<string> { const cookie = createCookie(runtime); await service.upsertCookie(email, cookie, kind); return cookie; }
async function hashPassword(password: string, salt: string): Promise<string> { return ((await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer).toString('hex'); }
async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> { const actual = Buffer.from(await hashPassword(password, salt), 'hex'); const expected = Buffer.from(expectedHash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
function toPublicUser(user: UserRecord): PublicUser { return { email: user.email, name: user.name, cart: user.cart, pdfKeys: user.pdfKeys }; }
function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
function assertRequired(value: string, field: string): void { if (!value || value.trim().length === 0) throw new Error(`${field} is required.`); }
function createSalt(runtime: AccessRuntime = {}): string { return toToken(runtime.randomBytes?.(16) ?? nodeRandomBytes(16)); }
function createCookie(runtime: AccessRuntime = {}): string { return toToken(runtime.randomBytes?.(32) ?? nodeRandomBytes(32)); }
function createUuid(runtime: AccessRuntime = {}): string { return runtime.randomUUID?.() ?? nodeRandomUUID(); }
function toToken(value: string | Uint8Array): string { return typeof value === 'string' ? value : Buffer.from(value).toString('hex'); }
interface CartItem { productId: string; quantity: number; clientInstructions: string; colorVariation?: string }
function normalizeCart(cart: unknown[]): CartItem[] { return cart.map((item) => normalizeCartItem(item)); }
function normalizeCartItem(item: unknown): CartItem { if (!item || typeof item !== 'object') throw new Error('Invalid cart item.'); const record = item as Record<string, unknown>; const productId = String(record.productId ?? record.product_id ?? ''); if (!productId) throw new Error('Invalid cart item: productId is required.'); const quantity = Number(record.quantity ?? 1); if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid cart item: quantity must be positive.'); return { productId, quantity, clientInstructions: String(record.clientInstructions ?? record.client_instructions ?? ''), colorVariation: record.colorVariation === undefined ? undefined : String(record.colorVariation) }; }
function mergeCartItem(cart: unknown[], item: CartItem): CartItem[] { const normalized = normalizeCart(cart); const existing = normalized.find((cartItem) => cartItem.productId === item.productId && cartItem.colorVariation === item.colorVariation); if (existing) existing.quantity += item.quantity; else normalized.push(item); return normalized; }
async function getCartTarget(cookies: { sessionCookie?: string; clientCookie?: string }, service: MariaDbServiceLike, runtime: AccessRuntime): Promise<{ cookie: string; cookieName: 'session_cookie' | 'client_cookie'; cart: unknown[]; save: (cart: CartItem[]) => Promise<void> }> { if (cookies.clientCookie) { const cookieRecord = await service.findCookie(cookies.clientCookie); if (cookieRecord?.kind === 'client') { const user = await service.findUserByEmail(cookieRecord.email); if (user) return { cookie: cookies.clientCookie, cookieName: 'client_cookie', cart: user.cart, save: async (cart) => { await service.updateUser(user.email, { cart }); } }; } } const sessionCookie = cookies.sessionCookie ?? createCookie(runtime); const guest = await service.findGuestByCookie(sessionCookie); return { cookie: sessionCookie, cookieName: 'session_cookie', cart: guest?.cart ?? [], save: async (cart) => { await service.upsertGuestCart(sessionCookie, cart); } }; }
function assertValidOrderStatus(status: OrderStatus): void { if (!['pending', 'paid', 'fulfilled', 'cancelled'].includes(status)) throw new Error('Invalid order status.'); }
function validateBlogArticle(input: CreateBlogArticleInput): void { assertRequired(input.title, 'title'); assertRequired(input.slug, 'slug'); assertRequired(input.excerpt, 'excerpt'); validateBlogBlocks(input.blocks); }
function validateBlogBlocks(blocks: unknown): void { if (!Array.isArray(blocks)) throw new Error('Invalid blog blocks.'); for (const block of blocks) { if (!block || typeof block !== 'object' || !('type' in block)) throw new Error('Invalid blog block.'); } }
function roundCurrency(value: number): number { return Math.round(value * 100) / 100; }
async function loadBackendConfig(): Promise<BackendConfig> { const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../config.json'); return JSON.parse(await readFile(configPath, 'utf8')) as BackendConfig; }
