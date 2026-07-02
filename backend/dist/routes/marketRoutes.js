import { Router } from 'express';
import { createMariaDbAccess } from '../db/mariadb_access.js';
export function createMarketRouter(deps = {}) {
    const router = Router();
    const access = deps.access ?? createMariaDbAccess();
    router.get('/', async (_req, res, next) => {
        try {
            res.json(await access.listMarketEvents());
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/next', async (_req, res, next) => {
        try {
            res.json({ nextEvent: await access.getNextMarketEvent() });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
export const marketRouter = createMarketRouter();
