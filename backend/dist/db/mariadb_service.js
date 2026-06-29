import mariadb from 'mariadb';
export class MariaDbService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        email VARCHAR(320) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(320) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        cart JSON NOT NULL,
        pdf_keys JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS guests (
        guest_cookie VARCHAR(255) PRIMARY KEY,
        cart JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cookies (
        cookie VARCHAR(255) PRIMARY KEY,
        email VARCHAR(320) NOT NULL,
        kind ENUM('session', 'client', 'admin') NOT NULL,
        time_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cookies_email_kind (email, kind)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id CHAR(36) PRIMARY KEY,
        product_type ENUM('plushie', 'pattern') NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT '',
        price DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        thumbnail_image VARCHAR(1024) NOT NULL,
        available BOOLEAN NOT NULL DEFAULT TRUE,
        ready_to_ship BOOLEAN NULL,
        color_variations JSON NULL,
        pdf_key VARCHAR(1024) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_type_available (product_type, available)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '' AFTER product_type");
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id CHAR(36) PRIMARY KEY,
        product_id CHAR(36) NOT NULL,
        client_email VARCHAR(320) NOT NULL,
        details JSON NOT NULL,
        client_instructions TEXT NOT NULL,
        charged_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'paid', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orders_client_email (client_email),
        INDEX idx_orders_status (status),
        CONSTRAINT fk_orders_users_email FOREIGN KEY (client_email) REFERENCES users(email) ON DELETE CASCADE,
        CONSTRAINT fk_orders_products_id FOREIGN KEY (product_id) REFERENCES products(product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS blog_articles (
        article_id CHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT NOT NULL,
        blocks JSON NOT NULL,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_blog_articles_published (published),
        INDEX idx_blog_articles_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async close() { await this.pool.end(); }
    async insertAdmin(input) {
        await this.pool.query(`INSERT INTO admins (email, name, password_hash, salt) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), salt = VALUES(salt)`, [input.email, input.name, input.passwordHash, input.salt]);
        return { email: input.email, name: input.name, passwordHash: input.passwordHash, salt: input.salt };
    }
    async findAdminByEmail(email) {
        const row = await this.firstRow('SELECT * FROM admins WHERE email = ? LIMIT 1', [email]);
        return row ? mapAdmin(row) : null;
    }
    async insertUser(input) {
        const cart = input.cart ?? [];
        const pdfKeys = input.pdfKeys ?? [];
        await this.pool.query(`INSERT INTO users (email, name, password_hash, salt, cart, pdf_keys) VALUES (?, ?, ?, ?, ?, ?)`, [input.email, input.name, input.passwordHash, input.salt, stringifyJson(cart), stringifyJson(pdfKeys)]);
        return { email: input.email, name: input.name, passwordHash: input.passwordHash, salt: input.salt, cart, pdfKeys };
    }
    async findUserByEmail(email) {
        const row = await this.firstRow('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        return row ? mapUser(row) : null;
    }
    async updateUser(email, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'name', patch.name);
        addSet(assignments, params, 'password_hash', patch.passwordHash);
        addSet(assignments, params, 'salt', patch.salt);
        addSet(assignments, params, 'cart', patch.cart === undefined ? undefined : stringifyJson(patch.cart));
        addSet(assignments, params, 'pdf_keys', patch.pdfKeys === undefined ? undefined : stringifyJson(patch.pdfKeys));
        if (assignments.length)
            await this.pool.query(`UPDATE users SET ${assignments.join(', ')} WHERE email = ?`, [...params, email]);
        const user = await this.findUserByEmail(email);
        if (!user)
            throw new Error(`User not found: ${email}`);
        return user;
    }
    async deleteUser(email) { await this.pool.query('DELETE FROM users WHERE email = ?', [email]); }
    async upsertCookie(email, cookie, kind = 'client') {
        await this.pool.query(`INSERT INTO cookies (email, cookie, kind) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), kind = VALUES(kind), time_created = CURRENT_TIMESTAMP`, [email, cookie, kind]);
    }
    async findCookie(cookie) {
        const row = await this.firstRow('SELECT * FROM cookies WHERE cookie = ? LIMIT 1', [cookie]);
        return row ? mapCookie(row) : null;
    }
    async deleteCookie(cookie) { await this.pool.query('DELETE FROM cookies WHERE cookie = ?', [cookie]); }
    async upsertGuestCart(guestCookie, cart) {
        await this.pool.query(`INSERT INTO guests (guest_cookie, cart) VALUES (?, ?) ON DUPLICATE KEY UPDATE cart = VALUES(cart)`, [guestCookie, stringifyJson(cart)]);
        return { guestCookie, cart };
    }
    async findGuestByCookie(guestCookie) {
        const row = await this.firstRow('SELECT * FROM guests WHERE guest_cookie = ? LIMIT 1', [guestCookie]);
        return row ? mapGuest(row) : null;
    }
    async deleteGuest(guestCookie) { await this.pool.query('DELETE FROM guests WHERE guest_cookie = ?', [guestCookie]); }
    async insertProduct(input) {
        const product = normalizeProduct(input);
        await this.pool.query(`INSERT INTO products (
        product_id, product_type, title, price, description, thumbnail_image, available,
        ready_to_ship, color_variations, pdf_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            product.id,
            product.type,
            product.title,
            product.price,
            product.description,
            product.thumbnailImage,
            product.available,
            product.type === 'plushie' ? product.readyToShip : null,
            product.type === 'plushie' ? stringifyJson(product.colorVariations) : null,
            product.type === 'pattern' ? product.pdfKey : null,
        ]);
        return product;
    }
    async findProductById(productId) {
        const row = await this.firstRow('SELECT * FROM products WHERE product_id = ? LIMIT 1', [productId]);
        return row ? mapProduct(row) : null;
    }
    async listProducts(productType, includeUnavailable = false) {
        const where = [];
        const params = [];
        if (productType) {
            where.push('product_type = ?');
            params.push(productType);
        }
        if (!includeUnavailable)
            where.push('available = TRUE');
        const rows = await this.queryRows(`SELECT * FROM products${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`, params);
        return rows.map(mapProduct);
    }
    async updateProduct(productId, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'title', patch.title);
        addSet(assignments, params, 'price', patch.price);
        addSet(assignments, params, 'description', patch.description);
        addSet(assignments, params, 'thumbnail_image', patch.thumbnailImage);
        addSet(assignments, params, 'available', patch.available);
        addSet(assignments, params, 'ready_to_ship', patch.readyToShip);
        addSet(assignments, params, 'color_variations', patch.colorVariations === undefined ? undefined : stringifyJson(patch.colorVariations));
        addSet(assignments, params, 'pdf_key', patch.pdfKey);
        if (assignments.length)
            await this.pool.query(`UPDATE products SET ${assignments.join(', ')} WHERE product_id = ?`, [...params, productId]);
        const product = await this.findProductById(productId);
        if (!product)
            throw new Error(`Product not found: ${productId}`);
        return product;
    }
    async removeProduct(productId) { await this.updateProduct(productId, { available: false }); }
    async insertOrder(input) {
        const order = {
            orderId: input.orderId,
            productId: input.productId,
            clientEmail: input.clientEmail,
            details: input.details ?? {},
            clientInstructions: input.clientInstructions ?? '',
            chargedAmount: input.chargedAmount,
            status: input.status ?? 'pending',
        };
        await this.pool.query(`INSERT INTO orders (order_id, product_id, client_email, details, client_instructions, charged_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, [order.orderId, order.productId, order.clientEmail, stringifyJson(order.details), order.clientInstructions, order.chargedAmount, order.status]);
        return order;
    }
    async listOrdersForUser(email) {
        return (await this.queryRows('SELECT * FROM orders WHERE client_email = ? ORDER BY created_at DESC', [email])).map(mapOrder);
    }
    async listOrders() {
        return (await this.queryRows('SELECT * FROM orders ORDER BY created_at DESC')).map(mapOrder);
    }
    async updateOrderStatus(orderId, status) {
        await this.pool.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
        const row = await this.firstRow('SELECT * FROM orders WHERE order_id = ? LIMIT 1', [orderId]);
        if (!row)
            throw new Error(`Order not found: ${orderId}`);
        return mapOrder(row);
    }
    async listBlogArticles() {
        return (await this.queryRows('SELECT * FROM blog_articles ORDER BY created_at DESC')).map(mapBlogArticle);
    }
    async insertBlogArticle(input) {
        await this.pool.query(`INSERT INTO blog_articles (article_id, title, slug, excerpt, blocks, published) VALUES (?, ?, ?, ?, ?, ?)`, [input.articleId, input.title, input.slug, input.excerpt, stringifyJson(input.blocks), input.published ?? false]);
        const article = await this.findBlogArticleById(input.articleId);
        if (!article)
            throw new Error(`Blog article not found: ${input.articleId}`);
        return article;
    }
    async updateBlogArticle(articleId, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'title', patch.title);
        addSet(assignments, params, 'slug', patch.slug);
        addSet(assignments, params, 'excerpt', patch.excerpt);
        addSet(assignments, params, 'blocks', patch.blocks === undefined ? undefined : stringifyJson(patch.blocks));
        addSet(assignments, params, 'published', patch.published);
        if (assignments.length)
            await this.pool.query(`UPDATE blog_articles SET ${assignments.join(', ')} WHERE article_id = ?`, [...params, articleId]);
        const article = await this.findBlogArticleById(articleId);
        if (!article)
            throw new Error(`Blog article not found: ${articleId}`);
        return article;
    }
    async deleteBlogArticle(articleId) {
        await this.pool.query('DELETE FROM blog_articles WHERE article_id = ?', [articleId]);
    }
    async findBlogArticleById(articleId) {
        const row = await this.firstRow('SELECT * FROM blog_articles WHERE article_id = ? LIMIT 1', [articleId]);
        return row ? mapBlogArticle(row) : null;
    }
    async firstRow(sql, params = []) {
        const rows = await this.queryRows(sql, params);
        return rows[0] ?? null;
    }
    async queryRows(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return Array.isArray(result) ? result : [];
    }
}
export function createMariaDbService(env = process.env, driver = mariadb) {
    return new MariaDbService(driver.createPool({
        host: env.MARIADB_HOST ?? 'localhost',
        port: Number(env.MARIADB_PORT ?? '3306'),
        database: env.MARIADB_DATABASE ?? 'k_suite',
        user: env.MARIADB_USER ?? 'k_suite',
        password: env.MARIADB_PASSWORD ?? 'k_suite_password',
        connectionLimit: Number(env.MARIADB_CONNECTION_LIMIT ?? '5'),
    }));
}
function normalizeProduct(input) {
    const base = {
        id: input.id,
        type: input.type,
        title: input.title,
        price: input.price,
        description: input.description,
        thumbnailImage: input.thumbnailImage,
        available: input.available ?? true,
    };
    return input.type === 'plushie'
        ? { ...base, type: 'plushie', readyToShip: input.readyToShip, colorVariations: input.colorVariations }
        : { ...base, type: 'pattern', pdfKey: input.pdfKey };
}
function addSet(assignments, params, column, value) {
    if (value !== undefined) {
        assignments.push(`${column} = ?`);
        params.push(value);
    }
}
function mapAdmin(row) { return { email: String(row.email), name: String(row.name), passwordHash: String(row.password_hash), salt: String(row.salt), createdAt: row.created_at }; }
function mapUser(row) { return { email: String(row.email), name: String(row.name), passwordHash: String(row.password_hash), salt: String(row.salt), cart: parseJsonArray(row.cart), pdfKeys: parseJsonStringArray(row.pdf_keys), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapCookie(row) { return { email: String(row.email), cookie: String(row.cookie), kind: row.kind, timeCreated: row.time_created }; }
function mapGuest(row) { return { guestCookie: String(row.guest_cookie), cart: parseJsonArray(row.cart), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapProduct(row) {
    const base = { id: String(row.product_id), type: row.product_type, title: String(row.title ?? ''), price: Number(row.price), description: String(row.description), thumbnailImage: String(row.thumbnail_image), available: Boolean(row.available), createdAt: row.created_at, updatedAt: row.updated_at };
    return base.type === 'plushie'
        ? { ...base, type: 'plushie', readyToShip: Boolean(row.ready_to_ship), colorVariations: parseColorVariations(row.color_variations) }
        : { ...base, type: 'pattern', pdfKey: String(row.pdf_key ?? '') };
}
function mapOrder(row) { return { orderId: String(row.order_id), productId: String(row.product_id), clientEmail: String(row.client_email), details: parseJsonObject(row.details), clientInstructions: String(row.client_instructions ?? ''), chargedAmount: Number(row.charged_amount), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapBlogArticle(row) { return { articleId: String(row.article_id), title: String(row.title), slug: String(row.slug), excerpt: String(row.excerpt), blocks: parseBlogBlocks(row.blocks), published: Boolean(row.published), createdAt: row.created_at, updatedAt: row.updated_at }; }
function parseBlogBlocks(value) { return parseJsonArray(value); }
function stringifyJson(value) { return JSON.stringify(value); }
function parseJsonArray(value) { const parsed = parseJson(value); return Array.isArray(parsed) ? parsed : []; }
function parseJsonStringArray(value) { return parseJsonArray(value).map(String); }
function parseColorVariations(value) { return parseJsonArray(value).map((item) => { if (typeof item === 'string')
    return { name: item }; const record = item; return { name: String(record.name ?? ''), imageUrl: record.imageUrl === undefined ? undefined : String(record.imageUrl) }; }).filter((item) => item.name); }
function parseJsonObject(value) { const parsed = parseJson(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
function parseJson(value) { if (value === null || value === undefined)
    return null; if (typeof value === 'string')
    return JSON.parse(value); if (Buffer.isBuffer(value))
    return JSON.parse(value.toString('utf8')); return value; }
