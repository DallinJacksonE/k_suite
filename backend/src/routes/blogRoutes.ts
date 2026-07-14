import { Router, type Request, type Response } from 'express';
import type { MariaDbAccess } from '@k_suite/shared';
import { createMariaDbAccess } from '../db/mariadb_access.js';

export interface BlogRouterDeps {
  access?: Pick<MariaDbAccess, 'listPublishedBlogArticles' | 'listPublicBlogCollections'>;
}

export function createBlogRouter(deps: BlogRouterDeps = {}): Router {
  const router = Router();
  const access = deps.access ?? createMariaDbAccess();

  router.get('/articles', asyncHandler(async (_req, res) => {
    res.json({ articles: await access.listPublishedBlogArticles() });
  }));

  router.get('/collections', asyncHandler(async (_req, res) => {
    res.json({ collections: await access.listPublicBlogCollections() });
  }));

  return router;
}

export const blogRouter = createBlogRouter();

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    });
  };
}
