import { Router } from 'express';
import { createMariaDbAccess } from '../db/mariadb_access.js';
export function createBlogRouter(deps = {}) {
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
function asyncHandler(handler) {
    return (req, res) => {
        handler(req, res).catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: message });
        });
    };
}
