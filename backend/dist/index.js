import express from 'express';
import { initializeMariaDbAccess } from './db/mariadb_access.js';
import { adminRouter } from './routes/adminRouter.js';
import { blogRouter } from './routes/blogRoutes.js';
import { docsRouter } from './routes/docsRoutes.js';
import { marketRouter } from './routes/marketRoutes.js';
import { shopRouter } from './routes/shopRoutes.js';
import { userRouter } from './routes/userRoutes.js';
const app = express();
const PORT = process.env.PORT || 3000;
app.set('etag', false);
app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/docs', docsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/blog', blogRouter);
app.use('/api/shop', shopRouter);
app.use('/api/user', userRouter);
app.use('/api/markets', marketRouter);
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
async function startServer() {
    await initializeMariaDbAccess();
    app.listen(PORT, () => {
        console.log(`🚀 Server is running smoothly at http://localhost:${PORT}`);
    });
}
startServer().catch((error) => {
    console.error('Failed to start backend:', error);
    process.exit(1);
});
