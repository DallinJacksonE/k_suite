import { Router } from 'express';
import type { MariaDbAccess } from '@k_suite/shared';
import { createMariaDbAccess } from '../db/mariadb_access.js';

export interface MarketRouterDeps {
  access?: Pick<MariaDbAccess, 'listMarketEvents' | 'getNextMarketEvent'>;
}

export function createMarketRouter(deps: MarketRouterDeps = {}): Router {
  const router = Router();
  const access = deps.access ?? createMariaDbAccess();

  router.get('/', async (_req, res, next) => {
    try {
      res.json(await access.listMarketEvents());
    } catch (error) {
      next(error);
    }
  });

  router.get('/next', async (_req, res, next) => {
    try {
      res.json({ nextEvent: await access.getNextMarketEvent() });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const marketRouter = createMarketRouter();
