import { Router, type Request, type Response } from 'express';
import type { CartItemInput, MariaDbAccess, ProductType } from '@k_suite/shared';
import { createMariaDbAccess } from '../db/mariadb_access.js';

export interface ShopRouterDeps {
  access?: Pick<MariaDbAccess, 'listShopProducts' | 'addCartItem' | 'removeCartItem'>;
}

export function createShopRouter(deps: ShopRouterDeps = {}): Router {
  const router = Router();
  const access = deps.access ?? createMariaDbAccess();

  mountProductRoutes(router, access, 'plushie', '/plushies');
  mountProductRoutes(router, access, 'pattern', '/patterns');

  return router;
}

export const shopRouter = createShopRouter();

function mountProductRoutes(router: Router, access: Pick<MariaDbAccess, 'listShopProducts' | 'addCartItem' | 'removeCartItem'>, productType: ProductType, path: string): void {
  router.get(path, asyncHandler(async (req, res) => {
    const products = await access.listShopProducts(productType, readOptionalNumber(req, 'batchSize'), readOptionalString(req, 'afterId'));
    res.json({ products });
  }));

  router.post(path, asyncHandler(async (req, res) => {
    const result = await access.addCartItem(req.body as CartItemInput, readCartCookies(req));
    setCookie(res, result.cookieName, result.cookie);
    res.json({ cart: result.cart });
  }));

  router.delete(path, asyncHandler(async (req, res) => {
    const productId = (req.body as { productId?: unknown }).productId;
    if (typeof productId !== 'string' || !productId) throw new Error('productId is required.');
    const result = await access.removeCartItem(productId, readCartCookies(req));
    setCookie(res, result.cookieName, result.cookie);
    res.json({ cart: result.cart });
  }));
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('required') || message.includes('Invalid') ? 400 : 500;
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

function readCookie(req: Request, name: string): string | undefined {
  const rawCookie = req.headers.cookie ?? '';
  const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

function setCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, { httpOnly: true, sameSite: 'lax' });
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
