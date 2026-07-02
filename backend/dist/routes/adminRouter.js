import { Router } from 'express';
import multer from 'multer';
import { createMariaDbAccess } from '../db/mariadb_access.js';
import { createMinIoBucketService } from '../db/minIo.js';
import { readCookie, setAdminCookie } from './cookieHelpers.js';
const upload = multer({ storage: multer.memoryStorage() });
export function createAdminRouter(deps = {}) {
    const router = Router();
    const access = deps.access ?? createMariaDbAccess();
    const bucket = deps.bucket ?? createMinIoBucketService();
    router.post('/login', asyncHandler(async (req, res) => {
        const result = await access.adminLogin(req.body);
        setAdminCookie(res, result.cookie);
        res.status(200).json(result);
    }));
    router.get('/orders', asyncHandler(async (req, res) => {
        res.json({ orders: await access.getOrders(readAdminCookie(req)) });
    }));
    router.patch('/orders/:orderId/status', asyncHandler(async (req, res) => {
        const order = await access.updateOrderStatus(readAdminCookie(req), readParam(req, 'orderId'), readOrderStatus(req.body));
        res.json({ order });
    }));
    router.get('/products', asyncHandler(async (req, res) => {
        res.json({ products: await access.listAdminProducts(readAdminCookie(req)) });
    }));
    router.post('/products', asyncHandler(async (req, res) => {
        const product = await access.addProduct(readAdminCookie(req), req.body);
        res.status(201).json({ product });
    }));
    router.patch('/products/:productId', asyncHandler(async (req, res) => {
        const product = await access.editProduct(readAdminCookie(req), readParam(req, 'productId'), req.body);
        res.json({ product });
    }));
    router.delete('/products/:productId', asyncHandler(async (req, res) => {
        await access.removeProduct(readAdminCookie(req), readParam(req, 'productId'));
        res.status(204).send();
    }));
    router.post('/photos/:category', upload.single('file'), asyncHandler(async (req, res) => {
        const category = parsePhotoCategory(readParam(req, 'category'));
        const file = requireFile(req);
        const result = await bucket.uploadPhoto(category, { originalName: file.originalname, mimeType: file.mimetype, buffer: file.buffer });
        res.status(201).json(result);
    }));
    router.delete('/photos/:category/*key', asyncHandler(async (req, res) => {
        parsePhotoCategory(readParam(req, 'category'));
        await bucket.deletePublicObject(readWildcardKey(req));
        res.status(204).send();
    }));
    router.post('/pdfs/patterns', upload.single('file'), asyncHandler(async (req, res) => {
        const file = requireFile(req);
        const result = await bucket.uploadPatternPdf({ originalName: file.originalname, mimeType: file.mimetype, buffer: file.buffer });
        res.status(201).json(result);
    }));
    router.delete('/pdfs/patterns/*key', asyncHandler(async (req, res) => {
        await bucket.deletePatternPdf(readWildcardKey(req));
        res.status(204).send();
    }));
    router.get('/service-health', asyncHandler(async (req, res) => {
        res.json({ health: await access.getServiceHealth(readAdminCookie(req)) });
    }));
    router.get('/blog/articles', asyncHandler(async (req, res) => {
        res.json({ articles: await access.listBlogArticles(readAdminCookie(req)) });
    }));
    router.post('/blog/articles', asyncHandler(async (req, res) => {
        const article = await access.createBlogArticle(readAdminCookie(req), req.body);
        res.status(201).json({ article });
    }));
    router.patch('/blog/articles/:articleId', asyncHandler(async (req, res) => {
        const article = await access.updateBlogArticle(readAdminCookie(req), readParam(req, 'articleId'), req.body);
        res.json({ article });
    }));
    router.delete('/blog/articles/:articleId', asyncHandler(async (req, res) => {
        await access.deleteBlogArticle(readAdminCookie(req), readParam(req, 'articleId'));
        res.status(204).send();
    }));
    router.get('/markets', asyncHandler(async (req, res) => {
        res.json({ events: await access.listAdminMarketEvents(readAdminCookie(req)) });
    }));
    router.post('/markets', asyncHandler(async (req, res) => {
        const event = await access.createMarketEvent(readAdminCookie(req), req.body);
        res.status(201).json({ event });
    }));
    router.patch('/markets/:eventId', asyncHandler(async (req, res) => {
        const event = await access.updateMarketEvent(readAdminCookie(req), readParam(req, 'eventId'), req.body);
        res.json({ event });
    }));
    router.delete('/markets/:eventId', asyncHandler(async (req, res) => {
        await access.deleteMarketEvent(readAdminCookie(req), readParam(req, 'eventId'));
        res.status(204).send();
    }));
    return router;
}
export const adminRouter = createAdminRouter();
function asyncHandler(handler) {
    return (req, res) => {
        handler(req, res).catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = message.includes('required') || message.includes('Invalid') ? 400 : message.includes('Admin access') ? 401 : 500;
            res.status(status).json({ error: message });
        });
    };
}
function readAdminCookie(req) {
    const value = readCookie(req, 'admin_cookie') ?? req.header('x-admin-cookie') ?? '';
    if (!value)
        throw new Error('Admin access required.');
    return value;
}
function requireFile(req) {
    if (!req.file)
        throw new Error('file is required.');
    return req.file;
}
function parsePhotoCategory(value) {
    if (value === 'product' || value === 'blog')
        return value;
    throw new Error('Invalid photo category.');
}
function readOrderStatus(body) {
    const status = body.status;
    if (status === 'pending' || status === 'paid' || status === 'fulfilled' || status === 'shipped' || status === 'cancelled')
        return status;
    throw new Error('Invalid order status.');
}
function readWildcardKey(req) {
    const value = req.params.key;
    const key = Array.isArray(value) ? value.join('/') : value;
    if (!key)
        throw new Error('object key is required.');
    return key;
}
function readParam(req, name) {
    const value = req.params[name];
    if (!value || Array.isArray(value))
        throw new Error(`${name} is required.`);
    return value;
}
