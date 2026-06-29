import { Router } from 'express';
import { createMariaDbAccess } from '../db/mariadb_access.js';
export function createShopRouter(deps = {}) {
    const router = Router();
    const access = deps.access ?? createMariaDbAccess();
    mountProductRoutes(router, access, 'plushie', '/plushies');
    mountProductRoutes(router, access, 'pattern', '/patterns');
    return router;
}
export const shopRouter = createShopRouter();
function mountProductRoutes(router, access, productType, path) {
    router.get(path, asyncHandler(async (req, res) => {
        const products = await access.listShopProducts(productType, readOptionalNumber(req, 'batchSize'), readOptionalString(req, 'afterId'));
        res.json({ products });
    }));
    router.post(path, asyncHandler(async (req, res) => {
        const result = await access.addCartItem(req.body, readCartCookies(req));
        setCookie(res, result.cookieName, result.cookie);
        res.json({ cart: result.cart });
    }));
    router.delete(path, asyncHandler(async (req, res) => {
        const productId = req.body.productId;
        if (typeof productId !== 'string' || !productId)
            throw new Error('productId is required.');
        const result = await access.removeCartItem(productId, readCartCookies(req));
        setCookie(res, result.cookieName, result.cookie);
        res.json({ cart: result.cart });
    }));
}
function asyncHandler(handler) {
    return (req, res) => {
        handler(req, res).catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = message.includes('required') || message.includes('Invalid') ? 400 : 500;
            res.status(status).json({ error: message });
        });
    };
}
function readCartCookies(req) {
    return {
        sessionCookie: readCookie(req, 'session_cookie'),
        clientCookie: readCookie(req, 'client_cookie'),
    };
}
function readCookie(req, name) {
    const rawCookie = req.headers.cookie ?? '';
    const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}
function setCookie(res, name, value) {
    res.cookie(name, value, { httpOnly: true, sameSite: 'lax' });
}
function readOptionalString(req, name) {
    const value = req.query[name];
    return typeof value === 'string' && value ? value : undefined;
}
function readOptionalNumber(req, name) {
    const value = readOptionalString(req, name);
    if (value === undefined)
        return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        throw new Error(`${name} must be a positive number.`);
    return parsed;
}
