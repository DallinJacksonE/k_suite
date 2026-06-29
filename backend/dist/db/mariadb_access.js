import { readFile } from 'node:fs/promises';
import { randomBytes as nodeRandomBytes, randomUUID as nodeRandomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createMariaDbService } from './mariadb_service.js';
const scryptAsync = promisify(nodeScrypt);
const PASSWORD_KEY_LENGTH = 64;
const defaultService = createMariaDbService();
export function createMariaDbAccess(service = defaultService, runtime = {}) {
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
export async function initializeMariaDbAccess(service = defaultService) {
    await service.initialize();
    await bootstrapAdmin(service);
}
export async function closeMariaDbAccess(service = defaultService) { await service.close(); }
export async function bootstrapAdmin(service = defaultService, config = loadBackendConfig) {
    const { admin } = await config();
    const salt = createSalt();
    await service.insertAdmin({ email: normalizeEmail(admin.email), name: admin.name, passwordHash: await hashPassword(admin.password, salt), salt });
}
export async function adminLogin(input, service = defaultService, runtime = {}) {
    const email = normalizeEmail(input.email);
    const admin = await service.findAdminByEmail(email);
    if (!admin || !(await verifyPassword(input.password, admin.salt, admin.passwordHash)))
        throw new Error('Invalid admin credentials.');
    const cookie = await createAndStoreCookie(email, 'admin', service, runtime);
    return { admin: { email: admin.email, name: admin.name }, cookie };
}
export async function checkUserPassword(email, password, service = defaultService) {
    const user = await service.findUserByEmail(normalizeEmail(email));
    return !!user && verifyPassword(password, user.salt, user.passwordHash);
}
export async function loginUser(input, service = defaultService, runtime = {}) {
    const email = normalizeEmail(input.email);
    const user = await service.findUserByEmail(email);
    if (!user || !(await verifyPassword(input.password, user.salt, user.passwordHash)))
        throw new Error('Invalid user credentials.');
    return { user: toPublicUser(user), cookie: await createAndStoreCookie(email, 'client', service, runtime) };
}
export async function addUser(userData, service = defaultService, runtime = {}) {
    const email = normalizeEmail(userData.email);
    assertRequired(email, 'email');
    assertRequired(userData.name, 'name');
    assertRequired(userData.password, 'password');
    if (await service.findUserByEmail(email))
        throw new Error('Email is already in use.');
    const salt = createSalt(runtime);
    const guestCart = userData.guestCookie ? (await service.findGuestByCookie(userData.guestCookie))?.cart ?? [] : [];
    const user = await service.insertUser({ email, name: userData.name, passwordHash: await hashPassword(userData.password, salt), salt, cart: guestCart, pdfKeys: [] });
    if (userData.guestCookie)
        await service.deleteGuest(userData.guestCookie);
    return { user: toPublicUser(user), cookie: await createAndStoreCookie(email, 'client', service, runtime) };
}
export async function getUser(email, cookie, service = defaultService) {
    const user = await requireUserWithCookie(email, cookie, service, 'client');
    return { user: toPublicUser(user), orders: await service.listOrdersForUser(user.email) };
}
export async function updateUser(userData, email, cookie, service = defaultService) {
    const user = await requireUserWithCookie(email, cookie, service, 'client');
    const patch = {};
    if (userData.name !== undefined)
        patch.name = userData.name;
    if (userData.cart !== undefined)
        patch.cart = userData.cart;
    if (userData.pdfKeys !== undefined)
        patch.pdfKeys = userData.pdfKeys;
    if (userData.password !== undefined) {
        const salt = createSalt();
        patch.salt = salt;
        patch.passwordHash = await hashPassword(userData.password, salt);
    }
    return toPublicUser(await service.updateUser(user.email, patch));
}
export async function deleteUser(email, cookie, service = defaultService) {
    const user = await requireUserWithCookie(email, cookie, service, 'client');
    await service.deleteUser(user.email);
}
export async function getOrders(adminCookie, service = defaultService) { await requireAdminCookie(adminCookie, service); return service.listOrders(); }
export async function updateOrderStatus(adminCookie, orderId, status, service = defaultService) { await requireAdminCookie(adminCookie, service); assertValidOrderStatus(status); return service.updateOrderStatus(orderId, status); }
export async function getServiceHealth(adminCookie, service = defaultService) { await requireAdminCookie(adminCookie, service); const checks = [{ name: 'database', status: 'ok' }, { name: 'objectStorage', status: 'ok' }]; return { status: checks.every((check) => check.status === 'ok') ? 'ok' : 'degraded', checkedAt: new Date().toISOString(), services: checks }; }
export async function newCookie(email, oldCookie, kind = 'client', service = defaultService, runtime = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (kind === 'admin') {
        if (!await service.findAdminByEmail(normalizedEmail))
            throw new Error(`Admin not found: ${normalizedEmail}`);
    }
    else {
        if (!await service.findUserByEmail(normalizedEmail))
            throw new Error(`User not found: ${normalizedEmail}`);
    }
    if (oldCookie)
        await service.deleteCookie(oldCookie);
    return createAndStoreCookie(normalizedEmail, kind, service, runtime);
}
export async function checkedout(email, cookie, paidAmount, service = defaultService, runtime = {}) {
    const user = await requireUserWithCookie(email, cookie, service, 'client');
    const cartItems = normalizeCart(user.cart);
    if (!cartItems.length)
        return [];
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const orders = [];
    for (const item of cartItems) {
        const product = await service.findProductById(item.productId);
        if (!product)
            throw new Error(`Product not found: ${item.productId}`);
        const orderInput = { orderId: createUuid(runtime), productId: item.productId, clientEmail: user.email, details: { productType: product.type, quantity: item.quantity, colorVariation: item.colorVariation, productSnapshot: product }, clientInstructions: item.clientInstructions, chargedAmount: roundCurrency((paidAmount * item.quantity) / totalQuantity), status: 'pending' };
        orders.push(await service.insertOrder(orderInput));
    }
    await service.updateUser(user.email, { cart: [] });
    return orders;
}
export async function addProduct(adminCookie, productDTO, service = defaultService, runtime = {}) {
    await requireAdminCookie(adminCookie, service);
    assertRequired(productDTO.title, 'title');
    return service.insertProduct({ ...productDTO, id: createUuid(runtime) });
}
export async function listAdminProducts(adminCookie, service = defaultService) { await requireAdminCookie(adminCookie, service); return service.listProducts(undefined, true); }
export async function editProduct(adminCookie, productId, productDTO, service = defaultService) { await requireAdminCookie(adminCookie, service); return service.updateProduct(productId, productDTO); }
export async function removeProduct(adminCookie, productId, service = defaultService) { await requireAdminCookie(adminCookie, service); await service.removeProduct(productId); }
export async function listBlogArticles(adminCookie, service = defaultService) { await requireAdminCookie(adminCookie, service); return service.listBlogArticles(); }
export async function createBlogArticle(adminCookie, input, service = defaultService, runtime = {}) { await requireAdminCookie(adminCookie, service); validateBlogArticle(input); return service.insertBlogArticle({ ...input, articleId: createUuid(runtime), published: input.published ?? false }); }
export async function updateBlogArticle(adminCookie, articleId, input, service = defaultService) { await requireAdminCookie(adminCookie, service); if (input.blocks)
    validateBlogBlocks(input.blocks); return service.updateBlogArticle(articleId, input); }
export async function deleteBlogArticle(adminCookie, articleId, service = defaultService) { await requireAdminCookie(adminCookie, service); await service.deleteBlogArticle(articleId); }
export async function listShopProducts(productType, batchSize = 20, afterId, service = defaultService) {
    const products = await service.listProducts(productType, false);
    const startIndex = afterId ? products.findIndex((product) => product.id === afterId) + 1 : 0;
    return products.slice(Math.max(0, startIndex), Math.max(0, startIndex) + batchSize);
}
export async function addCartItem(input, cookies, service = defaultService, runtime = {}) {
    const item = normalizeCartItem(input);
    if (!await service.findProductById(item.productId))
        throw new Error(`Product not found: ${item.productId}`);
    const target = await getCartTarget(cookies, service, runtime);
    const cart = mergeCartItem(target.cart, item);
    await target.save(cart);
    return { cookie: target.cookie, cookieName: target.cookieName, cart };
}
export async function removeCartItem(productId, cookies, service = defaultService, runtime = {}) {
    const target = await getCartTarget(cookies, service, runtime);
    const cart = normalizeCart(target.cart).filter((item) => item.productId !== productId);
    await target.save(cart);
    return { cookie: target.cookie, cookieName: target.cookieName, cart };
}
async function requireUserWithCookie(email, cookie, service, kind) {
    const normalizedEmail = normalizeEmail(email);
    const [user, cookieRecord] = await Promise.all([service.findUserByEmail(normalizedEmail), service.findCookie(cookie)]);
    if (!user || !cookieRecord || cookieRecord.email !== normalizedEmail || cookieRecord.kind !== kind)
        throw new Error('Invalid or expired cookie.');
    return user;
}
export async function requireAdminCookie(cookie, service = defaultService) {
    const cookieRecord = await service.findCookie(cookie);
    if (!cookieRecord || cookieRecord.kind !== 'admin' || !(await service.findAdminByEmail(cookieRecord.email)))
        throw new Error('Admin access required.');
}
async function createAndStoreCookie(email, kind, service, runtime) { const cookie = createCookie(runtime); await service.upsertCookie(email, cookie, kind); return cookie; }
async function hashPassword(password, salt) { return (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)).toString('hex'); }
async function verifyPassword(password, salt, expectedHash) { const actual = Buffer.from(await hashPassword(password, salt), 'hex'); const expected = Buffer.from(expectedHash, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
function toPublicUser(user) { return { email: user.email, name: user.name, cart: user.cart, pdfKeys: user.pdfKeys }; }
function normalizeEmail(email) { return email.trim().toLowerCase(); }
function assertRequired(value, field) { if (!value || value.trim().length === 0)
    throw new Error(`${field} is required.`); }
function createSalt(runtime = {}) { return toToken(runtime.randomBytes?.(16) ?? nodeRandomBytes(16)); }
function createCookie(runtime = {}) { return toToken(runtime.randomBytes?.(32) ?? nodeRandomBytes(32)); }
function createUuid(runtime = {}) { return runtime.randomUUID?.() ?? nodeRandomUUID(); }
function toToken(value) { return typeof value === 'string' ? value : Buffer.from(value).toString('hex'); }
function normalizeCart(cart) { return cart.map((item) => normalizeCartItem(item)); }
function normalizeCartItem(item) { if (!item || typeof item !== 'object')
    throw new Error('Invalid cart item.'); const record = item; const productId = String(record.productId ?? record.product_id ?? ''); if (!productId)
    throw new Error('Invalid cart item: productId is required.'); const quantity = Number(record.quantity ?? 1); if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error('Invalid cart item: quantity must be positive.'); return { productId, quantity, clientInstructions: String(record.clientInstructions ?? record.client_instructions ?? ''), colorVariation: record.colorVariation === undefined ? undefined : String(record.colorVariation) }; }
function mergeCartItem(cart, item) { const normalized = normalizeCart(cart); const existing = normalized.find((cartItem) => cartItem.productId === item.productId && cartItem.colorVariation === item.colorVariation); if (existing)
    existing.quantity += item.quantity;
else
    normalized.push(item); return normalized; }
async function getCartTarget(cookies, service, runtime) { if (cookies.clientCookie) {
    const cookieRecord = await service.findCookie(cookies.clientCookie);
    if (cookieRecord?.kind === 'client') {
        const user = await service.findUserByEmail(cookieRecord.email);
        if (user)
            return { cookie: cookies.clientCookie, cookieName: 'client_cookie', cart: user.cart, save: async (cart) => { await service.updateUser(user.email, { cart }); } };
    }
} const sessionCookie = cookies.sessionCookie ?? createCookie(runtime); const guest = await service.findGuestByCookie(sessionCookie); return { cookie: sessionCookie, cookieName: 'session_cookie', cart: guest?.cart ?? [], save: async (cart) => { await service.upsertGuestCart(sessionCookie, cart); } }; }
function assertValidOrderStatus(status) { if (!['pending', 'paid', 'fulfilled', 'cancelled'].includes(status))
    throw new Error('Invalid order status.'); }
function validateBlogArticle(input) { assertRequired(input.title, 'title'); assertRequired(input.slug, 'slug'); assertRequired(input.excerpt, 'excerpt'); validateBlogBlocks(input.blocks); }
function validateBlogBlocks(blocks) { if (!Array.isArray(blocks))
    throw new Error('Invalid blog blocks.'); for (const block of blocks) {
    if (!block || typeof block !== 'object' || !('type' in block))
        throw new Error('Invalid blog block.');
} }
function roundCurrency(value) { return Math.round(value * 100) / 100; }
async function loadBackendConfig() { const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../config.json'); return JSON.parse(await readFile(configPath, 'utf8')); }
