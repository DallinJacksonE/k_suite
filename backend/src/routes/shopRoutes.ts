import { Router, type Request, type Response } from 'express';
import type { CartItemInput, CheckoutEstimateRequest, CheckoutRequest, MariaDbAccess, ProductSortDirection, ProductSortKey, ProductType, ShopProductTypeFilter, UpdateCartItemInput } from '@k_suite/shared';
import { createMariaDbAccess, getCheckoutPublicConfig } from '../db/mariadb_access.js';
import { readCookie, setClientCookie, setSessionCookie } from './cookieHelpers.js';
import { requireCsrfToken } from './csrfHelpers.js';

export interface ShopRouterDeps {
  access?: Pick<MariaDbAccess, 'listShopProducts' | 'listAvailableProductFilterOptions' | 'listAvailableProductColors' | 'listAvailableProductSizes' | 'getCart' | 'addCartItem' | 'updateCartItem' | 'removeCartItem' | 'estimateCheckout' | 'checkout'>;
}

export function createShopRouter(deps: ShopRouterDeps = {}): Router {
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
    res.json(await access.updateCartItem(String(req.params.itemId), req.body as UpdateCartItemInput, readCartCookies(req)));
  }));
  router.post('/checkout/estimate', asyncHandler(async (req, res) => {
    res.json(await access.estimateCheckout(req.body as CheckoutEstimateRequest, readCartCookies(req)));
  }));
  router.get('/checkout/config', (_req, res) => {
    res.json(getCheckoutPublicConfig());
  });
  router.post('/checkout', asyncHandler(async (req, res) => {
    requireCsrfToken(req);
    res.status(201).json(await access.checkout(req.body as CheckoutRequest, readCartCookies(req)));
  }));

  return router;
}

export const shopRouter = createShopRouter();

function mountProductRoutes(router: Router, access: Pick<MariaDbAccess, 'listShopProducts' | 'addCartItem' | 'removeCartItem'>, productType: ProductType, path: string): void {
  router.get(path, asyncHandler(async (req, res) => {
    const batch = await access.listShopProducts({ filters: { type: productType }, batchSize: readOptionalNumber(req, 'batchSize'), afterId: readOptionalString(req, 'afterId') });
    res.json({ products: batch.products });
  }));

  router.post(path, asyncHandler(async (req, res) => {
    requireCsrfToken(req);
    const result = await access.addCartItem(req.body as CartItemInput, readCartCookies(req));
    if (result.cookieName === 'client_cookie') setClientCookie(res, result.cookie);
    else setSessionCookie(res, result.cookie);
    res.json({ cart: result.cart });
  }));

  router.delete(path, asyncHandler(async (req, res) => {
    requireCsrfToken(req);
    const productId = (req.body as { productId?: unknown }).productId;
    if (typeof productId !== 'string' || !productId) throw new Error('productId is required.');
    const result = await access.removeCartItem(productId, readCartCookies(req));
    if (result.cookieName === 'client_cookie') setClientCookie(res, result.cookie);
    else setSessionCookie(res, result.cookie);
    res.json({ cart: result.cart });
  }));
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = (error as { statusCode?: number }).statusCode ?? (message.includes('required') || message.includes('Invalid') ? 400 : 500);
      res.status(status).json({ error: message });
    });
  };
}

function readCartCookies(req: Request): { sessionCookie?: string; clientCookie?: string } {
  return {
    sessionCookie: readCookie(req, 'session_cookie'),
    clientCookie: readCookie(req, 'client_cookie'),
  };
}


function readOptionalString(req: Request, name: string): string | undefined {
  const value = req.query[name];
  return typeof value === 'string' && value ? value : undefined;
}

function readOptionalNumber(req: Request, name: string): number | undefined {
  const value = readOptionalString(req, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number.`);
  return parsed;
}

function readProductBatchRequest(req: Request) {
  return {
    filters: {
      type: readProductTypeFilter(req) ?? 'all',
      saleOnly: readOptionalBoolean(req, 'saleOnly'),
      color: readOptionalString(req, 'color'),
      size: readProductSizeFilter(req),
    },
    batchSize: readOptionalNumber(req, 'batchSize'),
    afterId: readOptionalString(req, 'afterId'),
    sort: readProductSortKey(req),
    direction: readSortDirection(req),
  };
}

function readProductTypeFilter(req: Request): ShopProductTypeFilter | undefined {
  const value = readOptionalString(req, 'type');
  if (value === undefined) return undefined;
  if (['plushie', 'pattern', 'all'].includes(value)) return value as ShopProductTypeFilter;
  throw new Error('type must be plushie, pattern, or all.');
}

function readProductSizeFilter(req: Request): string | undefined {
  const value = readOptionalString(req, 'size');
  if (value === undefined) return undefined;
  const sizes = value.split(',').map((size) => size.trim()).filter(Boolean);
  if (sizes.length && sizes.every((size) => ['extra-small', 'small', 'medium', 'large', 'extra-large'].includes(size))) return sizes.join(',');
  throw new Error('size is invalid.');
}

function readProductSortKey(req: Request): ProductSortKey | undefined {
  const value = readOptionalString(req, 'sort');
  if (value === undefined) return undefined;
  if (['createdAt', 'price', 'title'].includes(value)) return value as ProductSortKey;
  throw new Error('sort is invalid.');
}

function readSortDirection(req: Request): ProductSortDirection | undefined {
  const value = readOptionalString(req, 'direction');
  if (value === undefined) return undefined;
  if (['asc', 'desc'].includes(value)) return value as ProductSortDirection;
  throw new Error('direction is invalid.');
}

function readOptionalBoolean(req: Request, name: string): boolean | undefined {
  const value = readOptionalString(req, name);
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false.`);
}
