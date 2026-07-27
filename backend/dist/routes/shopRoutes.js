import { Router } from 'express';
import { createMariaDbAccess } from '../db/mariadb_access.js';
import { readCookie, setClientCookie, setSessionCookie } from './cookieHelpers.js';
import { requireCsrfToken } from './csrfHelpers.js';
export function createShopRouter(deps = {}) {
    const router = Router();
    const access = deps.access ?? createMariaDbAccess();
    mountProductRoutes(router, access, 'plushie', '/plushies');
    mountProductRoutes(router, access, 'pattern', '/patterns');
    router.get('/products', asyncHandler(async (req, res) => {
        res.json(await access.listShopProducts(readProductBatchRequest(req)));
    }));
    router.get('/filters', asyncHandler(async (_req, res) => {
        res.json(await access.listAvailableProductFilterOptions());
    }));
    router.get('/filters/colors', asyncHandler(async (_req, res) => {
        res.json({ colors: await access.listAvailableProductColors() });
    }));
    router.get('/filters/sizes', asyncHandler(async (_req, res) => {
        res.json({ sizes: await access.listAvailableProductSizes() });
    }));
    router.get('/cart', asyncHandler(async (req, res) => {
        res.json(await access.getCart(readCartCookies(req)));
    }));
    router.patch('/cart/items/:itemId', asyncHandler(async (req, res) => {
        requireCsrfToken(req);
        res.json(await access.updateCartItem(String(req.params.itemId), req.body, readCartCookies(req)));
    }));
    router.post('/checkout/estimate', asyncHandler(async (req, res) => {
        res.json(await access.estimateCheckout(req.body, readCartCookies(req)));
    }));
    router.post('/checkout', asyncHandler(async (req, res) => {
        requireCsrfToken(req);
        res.status(201).json(await access.checkout(req.body, readCartCookies(req)));
    }));
    return router;
}
export const shopRouter = createShopRouter();
function mountProductRoutes(router, access, productType, path) {
    router.get(path, asyncHandler(async (req, res) => {
        const batch = await access.listShopProducts({ filters: { type: productType }, batchSize: readOptionalNumber(req, 'batchSize'), afterId: readOptionalString(req, 'afterId') });
        res.json({ products: batch.products });
    }));
    router.post(path, asyncHandler(async (req, res) => {
        requireCsrfToken(req);
        const result = await access.addCartItem(req.body, readCartCookies(req));
        if (result.cookieName === 'client_cookie')
            setClientCookie(res, result.cookie);
        else
            setSessionCookie(res, result.cookie);
        res.json({ cart: result.cart });
    }));
    router.delete(path, asyncHandler(async (req, res) => {
        requireCsrfToken(req);
        const productId = req.body.productId;
        if (typeof productId !== 'string' || !productId)
            throw new Error('productId is required.');
        const result = await access.removeCartItem(productId, readCartCookies(req));
        if (result.cookieName === 'client_cookie')
            setClientCookie(res, result.cookie);
        else
            setSessionCookie(res, result.cookie);
        res.json({ cart: result.cart });
    }));
}
function asyncHandler(handler) {
    return (req, res) => {
        handler(req, res).catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = error.statusCode ?? (message.includes('required') || message.includes('Invalid') ? 400 : 500);
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
function readProductBatchRequest(req) {
    return {
        filters: {
            type: readProductTypeFilter(req) ?? 'all',
            saleOnly: readOptionalBoolean(req, 'saleOnly'),
            color: readOptionalString(req, 'color'),
            size: readProductSize(req),
        },
        batchSize: readOptionalNumber(req, 'batchSize'),
        afterId: readOptionalString(req, 'afterId'),
        sort: readProductSortKey(req),
        direction: readSortDirection(req),
    };
}
function readProductTypeFilter(req) {
    const value = readOptionalString(req, 'type');
    if (value === undefined)
        return undefined;
    if (['plushie', 'pattern', 'all'].includes(value))
        return value;
    throw new Error('type must be plushie, pattern, or all.');
}
function readProductSize(req) {
    const value = readOptionalString(req, 'size');
    if (value === undefined)
        return undefined;
    if (['extra-small', 'small', 'medium', 'large', 'extra-large'].includes(value))
        return value;
    throw new Error('size is invalid.');
}
function readProductSortKey(req) {
    const value = readOptionalString(req, 'sort');
    if (value === undefined)
        return undefined;
    if (['createdAt', 'price', 'title'].includes(value))
        return value;
    throw new Error('sort is invalid.');
}
function readSortDirection(req) {
    const value = readOptionalString(req, 'direction');
    if (value === undefined)
        return undefined;
    if (['asc', 'desc'].includes(value))
        return value;
    throw new Error('direction is invalid.');
}
function readOptionalBoolean(req, name) {
    const value = readOptionalString(req, name);
    if (value === undefined)
        return undefined;
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    throw new Error(`${name} must be true or false.`);
}
