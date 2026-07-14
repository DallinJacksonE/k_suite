import mariadb from 'mariadb';
import { DEFAULT_BLOG_COLLECTION_TAG, SESSION_TTL_MS } from '@k_suite/shared';
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
        shipping_address JSON NULL,
        billing_address JSON NULL,
        email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS guests (
        guest_cookie VARCHAR(255) PRIMARY KEY,
        cart JSON NOT NULL,
        last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 HOUR),
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
        last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 HOUR),
        INDEX idx_cookies_email_kind (email, kind)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query('ALTER TABLE cookies ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER time_created');
        await this.pool.query(`ALTER TABLE cookies ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 HOUR) AFTER last_seen_at`);
        await this.pool.query('ALTER TABLE guests ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER cart');
        await this.pool.query(`ALTER TABLE guests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 HOUR) AFTER last_seen_at`);
        await this.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_address JSON NULL AFTER pdf_keys');
        await this.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address JSON NULL AFTER shipping_address');
        await this.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER billing_address');
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id CHAR(36) PRIMARY KEY,
        product_type ENUM('plushie', 'pattern') NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT '',
        price DECIMAL(10,2) NOT NULL,
        sale_price DECIMAL(10,2) NULL,
        is_sale_item BOOLEAN NOT NULL DEFAULT FALSE,
        description TEXT NOT NULL,
        thumbnail_image VARCHAR(1024) NOT NULL,
        available BOOLEAN NOT NULL DEFAULT TRUE,
        ready_to_ship BOOLEAN NULL,
        color_variations JSON NULL,
        pdf_key VARCHAR(1024) NULL,
        sizes JSON NULL,
        tags JSON NULL,
        inventory_count INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_type_available (product_type, available)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '' AFTER product_type");
        await this.pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) NULL AFTER price');
        await this.pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS is_sale_item BOOLEAN NOT NULL DEFAULT FALSE AFTER sale_price');
        await this.pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSON NULL AFTER pdf_key');
        await this.pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSON NULL AFTER sizes');
        await this.pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_count INT NULL AFTER tags');
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id CHAR(36) PRIMARY KEY,
        idempotency_key VARCHAR(255) NULL UNIQUE,
        product_id CHAR(36) NOT NULL,
        client_email VARCHAR(320) NOT NULL,
        details JSON NOT NULL,
        client_instructions TEXT NOT NULL,
        charged_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'paid', 'fulfilled', 'shipped', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_orders_idempotency_key (idempotency_key),
        INDEX idx_orders_client_email (client_email),
        INDEX idx_orders_status (status),
        CONSTRAINT fk_orders_products_id FOREIGN KEY (product_id) REFERENCES products(product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) NULL UNIQUE AFTER order_id');
        await this.pool.query("ALTER TABLE orders MODIFY status ENUM('pending', 'paid', 'fulfilled', 'shipped', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending'");
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS purchased_patterns (
        user_email VARCHAR(320) NOT NULL,
        product_id CHAR(36) NOT NULL,
        order_id CHAR(36) NOT NULL,
        pdf_key VARCHAR(1024) NOT NULL,
        purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_email, product_id, order_id),
        INDEX idx_purchased_patterns_user (user_email),
        INDEX idx_purchased_patterns_product (product_id),
        CONSTRAINT fk_purchased_patterns_products_id FOREIGN KEY (product_id) REFERENCES products(product_id)
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
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS blog_collections (
        tag VARCHAR(128) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS blog_article_collections (
        article_id CHAR(36) NOT NULL,
        collection_tag VARCHAR(128) NOT NULL,
        PRIMARY KEY (article_id, collection_tag),
        INDEX idx_blog_article_collections_tag (collection_tag),
        CONSTRAINT fk_blog_article_collections_article FOREIGN KEY (article_id) REFERENCES blog_articles(article_id) ON DELETE CASCADE,
        CONSTRAINT fk_blog_article_collections_collection FOREIGN KEY (collection_tag) REFERENCES blog_collections(tag) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.seedDefaultBlogCollections();
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS market_events (
        event_id CHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        address VARCHAR(1024) NULL,
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NULL,
        description TEXT NULL,
        external_url VARCHAR(1024) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_market_events_starts_at (starts_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await this.pool.query('ALTER TABLE market_events ADD COLUMN IF NOT EXISTS address VARCHAR(1024) NULL AFTER location');
    }
    async seedDefaultBlogCollections() {
        await this.pool.query(`INSERT INTO blog_collections (tag, label) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label)`, [DEFAULT_BLOG_COLLECTION_TAG, 'Kaylies Creations Updates']);
        await this.pool.query(`INSERT INTO blog_collections (tag, label) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label)`, ['tutorials', 'Tutorials']);
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
    async listUsers() {
        return (await this.queryRows('SELECT * FROM users ORDER BY created_at DESC')).map(mapUser);
    }
    async updateUser(email, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'name', patch.name);
        addSet(assignments, params, 'password_hash', patch.passwordHash);
        addSet(assignments, params, 'salt', patch.salt);
        addSet(assignments, params, 'cart', patch.cart === undefined ? undefined : stringifyJson(patch.cart));
        addSet(assignments, params, 'pdf_keys', patch.pdfKeys === undefined ? undefined : stringifyJson(patch.pdfKeys));
        addSet(assignments, params, 'shipping_address', patch.addressBook?.shippingAddress === undefined ? undefined : stringifyJson(patch.addressBook.shippingAddress));
        addSet(assignments, params, 'billing_address', patch.addressBook?.billingAddress === undefined ? undefined : stringifyJson(patch.addressBook.billingAddress));
        addSet(assignments, params, 'email_notifications_enabled', patch.emailNotificationsEnabled);
        if (assignments.length)
            await this.pool.query(`UPDATE users SET ${assignments.join(', ')} WHERE email = ?`, [...params, email]);
        const user = await this.findUserByEmail(email);
        if (!user)
            throw new Error(`User not found: ${email}`);
        return user;
    }
    async deleteUser(email) { await this.pool.query('DELETE FROM users WHERE email = ?', [email]); }
    async upsertCookie(email, cookie, kind = 'client', expiresAt = new Date(Date.now() + SESSION_TTL_MS)) {
        await this.pool.query(`INSERT INTO cookies (email, cookie, kind, last_seen_at, expires_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), kind = VALUES(kind), last_seen_at = CURRENT_TIMESTAMP, expires_at = VALUES(expires_at)`, [email, cookie, kind, expiresAt]);
    }
    async findCookie(cookie) {
        const row = await this.firstRow('SELECT * FROM cookies WHERE cookie = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1', [cookie]);
        return row ? mapCookie(row) : null;
    }
    async deleteCookie(cookie) { await this.pool.query('DELETE FROM cookies WHERE cookie = ?', [cookie]); }
    async touchCookie(cookie, expiresAt) {
        await this.pool.query('UPDATE cookies SET last_seen_at = CURRENT_TIMESTAMP, expires_at = ? WHERE cookie = ?', [expiresAt, cookie]);
    }
    async deleteExpiredCookies(now) { await this.pool.query('DELETE FROM cookies WHERE expires_at <= ?', [now]); }
    async upsertGuestCart(guestCookie, cart, expiresAt = new Date(Date.now() + SESSION_TTL_MS)) {
        await this.pool.query(`INSERT INTO guests (guest_cookie, cart, last_seen_at, expires_at) VALUES (?, ?, CURRENT_TIMESTAMP, ?) ON DUPLICATE KEY UPDATE cart = VALUES(cart), last_seen_at = CURRENT_TIMESTAMP, expires_at = VALUES(expires_at)`, [guestCookie, stringifyJson(cart), expiresAt]);
        return { guestCookie, cart, lastSeenAt: new Date(), expiresAt };
    }
    async findGuestByCookie(guestCookie) {
        const row = await this.firstRow('SELECT * FROM guests WHERE guest_cookie = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1', [guestCookie]);
        return row ? mapGuest(row) : null;
    }
    async deleteGuest(guestCookie) { await this.pool.query('DELETE FROM guests WHERE guest_cookie = ?', [guestCookie]); }
    async touchGuest(guestCookie, expiresAt) {
        await this.pool.query('UPDATE guests SET last_seen_at = CURRENT_TIMESTAMP, expires_at = ? WHERE guest_cookie = ?', [expiresAt, guestCookie]);
    }
    async deleteExpiredGuests(now) { await this.pool.query('DELETE FROM guests WHERE expires_at <= ?', [now]); }
    async insertProduct(input) {
        const product = normalizeProduct(input);
        await this.pool.query(`INSERT INTO products (
        product_id, product_type, title, price, sale_price, is_sale_item, description, thumbnail_image, available,
        ready_to_ship, color_variations, pdf_key, sizes, tags, inventory_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            product.id,
            product.type,
            product.title,
            product.price,
            product.salePrice ?? null,
            product.isSaleItem,
            product.description,
            product.thumbnailImage,
            product.available,
            product.type === 'plushie' ? product.readyToShip : null,
            product.type === 'plushie' ? stringifyJson(product.colorVariations) : null,
            product.type === 'pattern' ? product.pdfKey : null,
            product.sizes.length ? stringifyJson(product.sizes) : null,
            product.tags === undefined ? null : stringifyJson(product.tags),
            product.inventoryCount ?? null,
        ]);
        return product;
    }
    async findProductById(productId) {
        const row = await this.firstRow('SELECT * FROM products WHERE product_id = ? LIMIT 1', [productId]);
        return row ? mapProduct(row) : null;
    }
    async listProducts(productType, includeUnavailable = false, sort = 'createdAt', direction = 'desc') {
        const where = [];
        const params = [];
        if (productType) {
            where.push('product_type = ?');
            params.push(productType);
        }
        if (!includeUnavailable)
            where.push('available = TRUE');
        const rows = await this.queryRows(`SELECT * FROM products${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ${productSortColumn(sort)} ${direction === 'asc' ? 'ASC' : 'DESC'}, product_id ASC`, params);
        return rows.map(mapProduct);
    }
    async updateProduct(productId, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'title', patch.title);
        addSet(assignments, params, 'price', patch.price);
        addSet(assignments, params, 'sale_price', patch.salePrice);
        addSet(assignments, params, 'is_sale_item', patch.isSaleItem);
        addSet(assignments, params, 'description', patch.description);
        addSet(assignments, params, 'thumbnail_image', patch.thumbnailImage);
        addSet(assignments, params, 'available', patch.available);
        addSet(assignments, params, 'ready_to_ship', patch.readyToShip);
        addSet(assignments, params, 'color_variations', patch.colorVariations === undefined ? undefined : stringifyJson(patch.colorVariations));
        addSet(assignments, params, 'pdf_key', patch.pdfKey);
        addSet(assignments, params, 'sizes', patch.sizes === undefined ? undefined : stringifyJson(patch.sizes));
        addSet(assignments, params, 'tags', patch.tags === undefined ? undefined : stringifyJson(patch.tags));
        addSet(assignments, params, 'inventory_count', patch.inventoryCount);
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
            idempotencyKey: input.idempotencyKey,
            productId: input.productId,
            clientEmail: input.clientEmail,
            details: input.details ?? {},
            clientInstructions: input.clientInstructions ?? '',
            chargedAmount: input.chargedAmount,
            status: input.status ?? 'pending',
        };
        await this.pool.query(`INSERT INTO orders (order_id, idempotency_key, product_id, client_email, details, client_instructions, charged_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [order.orderId, order.idempotencyKey ?? null, order.productId, order.clientEmail, stringifyJson(order.details), order.clientInstructions, order.chargedAmount, order.status]);
        return order;
    }
    async findOrderByIdempotencyKey(idempotencyKey) {
        const row = await this.firstRow('SELECT * FROM orders WHERE idempotency_key = ? LIMIT 1', [idempotencyKey]);
        return row ? mapOrder(row) : null;
    }
    async insertPurchasedPattern(input) {
        await this.pool.query(`INSERT INTO purchased_patterns (user_email, product_id, order_id, pdf_key) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pdf_key = VALUES(pdf_key)`, [input.userEmail, input.productId, input.orderId, input.pdfKey]);
        return { ...input, purchasedAt: new Date() };
    }
    async listPurchasedPatternsForUser(email) {
        return (await this.queryRows('SELECT * FROM purchased_patterns WHERE user_email = ? ORDER BY purchased_at DESC', [email])).map(mapPurchasedPattern);
    }
    async findPurchasedPatternForUser(email, productId) {
        const row = await this.firstRow('SELECT * FROM purchased_patterns WHERE user_email = ? AND product_id = ? ORDER BY purchased_at DESC LIMIT 1', [email, productId]);
        return row ? mapPurchasedPattern(row) : null;
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
    async listMarketEvents(now = new Date()) {
        return (await this.queryRows('SELECT * FROM market_events WHERE starts_at >= ? ORDER BY starts_at ASC', [now])).map(mapMarketEvent);
    }
    async getNextMarketEvent(now = new Date()) {
        const row = await this.firstRow('SELECT * FROM market_events WHERE starts_at >= ? ORDER BY starts_at ASC LIMIT 1', [now]);
        return row ? mapMarketEvent(row) : null;
    }
    async insertMarketEvent(input) {
        await this.pool.query(`INSERT INTO market_events (event_id, title, location, address, starts_at, ends_at, description, external_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [input.id, input.title, input.location, input.address ?? null, input.startsAt, input.endsAt ?? null, input.description ?? null, input.externalUrl ?? null]);
        const event = await this.findMarketEventById(input.id);
        if (!event)
            throw new Error(`Market event not found: ${input.id}`);
        return event;
    }
    async updateMarketEvent(eventId, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'title', patch.title);
        addSet(assignments, params, 'location', patch.location);
        addSet(assignments, params, 'address', patch.address);
        addSet(assignments, params, 'starts_at', patch.startsAt);
        addSet(assignments, params, 'ends_at', patch.endsAt);
        addSet(assignments, params, 'description', patch.description);
        addSet(assignments, params, 'external_url', patch.externalUrl);
        if (assignments.length)
            await this.pool.query(`UPDATE market_events SET ${assignments.join(', ')} WHERE event_id = ?`, [...params, eventId]);
        const event = await this.findMarketEventById(eventId);
        if (!event)
            throw new Error(`Market event not found: ${eventId}`);
        return event;
    }
    async deleteMarketEvent(eventId) {
        await this.pool.query('DELETE FROM market_events WHERE event_id = ?', [eventId]);
    }
    async listBlogCollections() {
        return (await this.queryRows('SELECT * FROM blog_collections ORDER BY label ASC')).map(mapBlogCollection);
    }
    async insertBlogCollection(input) {
        await this.pool.query(`INSERT INTO blog_collections (tag, label, description) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)`, [input.tag, input.label, input.description ?? null]);
        const collection = await this.findBlogCollectionByTag(input.tag);
        if (!collection)
            throw new Error(`Blog collection not found: ${input.tag}`);
        return collection;
    }
    async updateBlogCollection(tag, patch) {
        const assignments = [];
        const params = [];
        addSet(assignments, params, 'tag', patch.tag);
        addSet(assignments, params, 'label', patch.label);
        addSet(assignments, params, 'description', patch.description ?? (patch.description === undefined ? undefined : null));
        if (assignments.length)
            await this.pool.query(`UPDATE blog_collections SET ${assignments.join(', ')} WHERE tag = ?`, [...params, tag]);
        const collection = await this.findBlogCollectionByTag(patch.tag ?? tag);
        if (!collection)
            throw new Error(`Blog collection not found: ${tag}`);
        return collection;
    }
    async deleteBlogCollection(tag) {
        await this.pool.query('DELETE FROM blog_article_collections WHERE collection_tag = ?', [tag]);
        await this.pool.query('DELETE FROM blog_collections WHERE tag = ?', [tag]);
    }
    async listBlogArticles() {
        const rows = await this.queryRows('SELECT * FROM blog_articles ORDER BY created_at DESC');
        return Promise.all(rows.map(async (row) => mapBlogArticle(row, await this.listCollectionTagsForArticle(String(row.article_id)))));
    }
    async insertBlogArticle(input) {
        await this.pool.query(`INSERT INTO blog_articles (article_id, title, slug, excerpt, blocks, published) VALUES (?, ?, ?, ?, ?, ?)`, [input.articleId, input.title, input.slug, input.excerpt, stringifyJson(input.blocks), input.published ?? false]);
        await this.replaceArticleCollectionTags(input.articleId, input.collectionTags);
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
        if (patch.collectionTags !== undefined)
            await this.replaceArticleCollectionTags(articleId, patch.collectionTags);
        const article = await this.findBlogArticleById(articleId);
        if (!article)
            throw new Error(`Blog article not found: ${articleId}`);
        return article;
    }
    async deleteBlogArticle(articleId) {
        await this.pool.query('DELETE FROM blog_article_collections WHERE article_id = ?', [articleId]);
        await this.pool.query('DELETE FROM blog_articles WHERE article_id = ?', [articleId]);
    }
    async findBlogCollectionByTag(tag) {
        const row = await this.firstRow('SELECT * FROM blog_collections WHERE tag = ? LIMIT 1', [tag]);
        return row ? mapBlogCollection(row) : null;
    }
    async findBlogArticleById(articleId) {
        const row = await this.firstRow('SELECT * FROM blog_articles WHERE article_id = ? LIMIT 1', [articleId]);
        return row ? mapBlogArticle(row, await this.listCollectionTagsForArticle(articleId)) : null;
    }
    async replaceArticleCollectionTags(articleId, tags) {
        const normalized = tags?.length ? tags : [DEFAULT_BLOG_COLLECTION_TAG];
        await this.pool.query('DELETE FROM blog_article_collections WHERE article_id = ?', [articleId]);
        for (const tag of normalized) {
            await this.ensureBlogCollection(tag);
            await this.pool.query('INSERT INTO blog_article_collections (article_id, collection_tag) VALUES (?, ?) ON DUPLICATE KEY UPDATE collection_tag = VALUES(collection_tag)', [articleId, tag]);
        }
    }
    async listCollectionTagsForArticle(articleId) {
        const rows = await this.queryRows('SELECT collection_tag FROM blog_article_collections WHERE article_id = ? ORDER BY collection_tag ASC', [articleId]);
        const tags = rows.map((row) => String(row.collection_tag));
        return tags.length ? tags : [DEFAULT_BLOG_COLLECTION_TAG];
    }
    async ensureBlogCollection(tag) {
        await this.pool.query(`INSERT INTO blog_collections (tag, label) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE tag = VALUES(tag)`, [tag, labelFromTag(tag)]);
    }
    async findMarketEventById(eventId) {
        const row = await this.firstRow('SELECT * FROM market_events WHERE event_id = ? LIMIT 1', [eventId]);
        return row ? mapMarketEvent(row) : null;
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
        salePrice: input.salePrice,
        isSaleItem: input.isSaleItem ?? false,
        description: input.description,
        thumbnailImage: input.thumbnailImage,
        available: input.available ?? true,
        sizes: input.sizes ?? [],
        tags: input.tags,
        inventoryCount: input.inventoryCount,
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
function mapUser(row) { const addressBook = { shippingAddress: parseOptionalJsonObject(row.shipping_address), billingAddress: parseOptionalJsonObject(row.billing_address) }; return { email: String(row.email), name: String(row.name), passwordHash: String(row.password_hash), salt: String(row.salt), cart: parseJsonArray(row.cart), pdfKeys: parseJsonStringArray(row.pdf_keys), addressBook: addressBook?.shippingAddress || addressBook?.billingAddress ? addressBook : undefined, emailNotificationsEnabled: row.email_notifications_enabled === undefined ? undefined : Boolean(row.email_notifications_enabled), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapCookie(row) { return { email: String(row.email), cookie: String(row.cookie), kind: row.kind, timeCreated: row.time_created, lastSeenAt: row.last_seen_at, expiresAt: row.expires_at }; }
function mapGuest(row) { return { guestCookie: String(row.guest_cookie), cart: parseJsonArray(row.cart), lastSeenAt: row.last_seen_at, expiresAt: row.expires_at, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapProduct(row) {
    const base = { id: String(row.product_id), type: row.product_type, title: String(row.title ?? ''), price: Number(row.price), salePrice: optionalNumber(row.sale_price), isSaleItem: Boolean(row.is_sale_item), description: String(row.description), thumbnailImage: String(row.thumbnail_image), available: Boolean(row.available), sizes: parseProductSizes(row.sizes), tags: parseOptionalJsonStringArray(row.tags), inventoryCount: optionalNumber(row.inventory_count), createdAt: row.created_at, updatedAt: row.updated_at };
    return base.type === 'plushie'
        ? { ...base, type: 'plushie', readyToShip: Boolean(row.ready_to_ship), colorVariations: parseColorVariations(row.color_variations) }
        : { ...base, type: 'pattern', pdfKey: String(row.pdf_key ?? '') };
}
function mapOrder(row) { return { orderId: String(row.order_id), idempotencyKey: row.idempotency_key === null || row.idempotency_key === undefined ? undefined : String(row.idempotency_key), productId: String(row.product_id), clientEmail: String(row.client_email), details: parseJsonObject(row.details), clientInstructions: String(row.client_instructions ?? ''), chargedAmount: Number(row.charged_amount), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapPurchasedPattern(row) { return { userEmail: String(row.user_email), productId: String(row.product_id), orderId: String(row.order_id), pdfKey: String(row.pdf_key), purchasedAt: row.purchased_at }; }
function mapMarketEvent(row) { return { id: String(row.event_id), title: String(row.title), location: String(row.location), address: row.address === null || row.address === undefined ? undefined : String(row.address), startsAt: row.starts_at, endsAt: row.ends_at, description: row.description === null || row.description === undefined ? undefined : String(row.description), externalUrl: row.external_url === null || row.external_url === undefined ? undefined : String(row.external_url) }; }
function mapBlogCollection(row) { return { tag: String(row.tag), label: String(row.label), description: row.description === null || row.description === undefined ? undefined : String(row.description), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapBlogArticle(row, collectionTags = [DEFAULT_BLOG_COLLECTION_TAG]) { return { articleId: String(row.article_id), title: String(row.title), slug: String(row.slug), excerpt: String(row.excerpt), blocks: parseBlogBlocks(row.blocks), collectionTags, published: Boolean(row.published), createdAt: row.created_at, updatedAt: row.updated_at }; }
function parseBlogBlocks(value) { return parseJsonArray(value); }
function stringifyJson(value) { return JSON.stringify(value); }
function parseJsonArray(value) { const parsed = parseJson(value); return Array.isArray(parsed) ? parsed : []; }
function parseJsonStringArray(value) { return parseJsonArray(value).map(String); }
function parseOptionalJsonStringArray(value) { if (value === null || value === undefined)
    return undefined; return parseJsonStringArray(value); }
function parseProductSizes(value) { return parseJsonStringArray(value).filter(isProductSize); }
function isProductSize(value) { return ['extra-small', 'small', 'medium', 'large', 'extra-large'].includes(value); }
function parseColorVariations(value) { return parseJsonArray(value).map((item) => { if (typeof item === 'string')
    return { name: item }; const record = item; return { name: String(record.name ?? ''), imageUrl: record.imageUrl === undefined ? undefined : String(record.imageUrl) }; }).filter((item) => item.name); }
function parseJsonObject(value) { const parsed = parseJson(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
function parseOptionalJsonObject(value) { if (value === null || value === undefined)
    return undefined; return parseJsonObject(value); }
function parseJson(value) { if (value === null || value === undefined)
    return null; if (typeof value === 'string')
    return JSON.parse(value); if (Buffer.isBuffer(value))
    return JSON.parse(value.toString('utf8')); return value; }
function optionalNumber(value) { return value === null || value === undefined ? undefined : Number(value); }
function productSortColumn(sort) { if (sort === 'price')
    return 'price'; if (sort === 'title')
    return 'title'; return 'created_at'; }
function labelFromTag(tag) { return tag.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
