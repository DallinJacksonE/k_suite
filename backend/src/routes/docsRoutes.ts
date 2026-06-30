import { Router } from 'express';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Location = 'body' | 'cookie' | 'formData' | 'header' | 'path' | 'query';

interface ApiFieldDoc {
  name: string;
  type: string;
  location: Location;
  required: boolean;
  description: string;
}

interface ApiResponseDoc {
  status: number;
  description: string;
  body?: string;
}

interface ApiEndpointDoc {
  method: HttpMethod;
  path: string;
  summary: string;
  auth: string;
  contentType?: string;
  fields?: ApiFieldDoc[];
  setsCookies?: string[];
  clearsCookies?: string[];
  responses: ApiResponseDoc[];
}

interface ApiDocsResponse {
  title: string;
  version: number;
  basePath: '/api';
  endpoints: ApiEndpointDoc[];
}

const productFields: ApiFieldDoc[] = [
  { name: 'type', type: "'plushie' | 'pattern'", location: 'body', required: true, description: 'Product category.' },
  { name: 'title', type: 'string', location: 'body', required: true, description: 'Product title shown in shop listings.' },
  { name: 'price', type: 'number', location: 'body', required: true, description: 'Product price.' },
  { name: 'description', type: 'string', location: 'body', required: true, description: 'Product description.' },
  { name: 'thumbnailImage', type: 'string', location: 'body', required: true, description: 'Thumbnail image URL or object key.' },
  { name: 'available', type: 'boolean', location: 'body', required: false, description: 'Whether the product is available to shoppers.' },
  { name: 'readyToShip', type: 'boolean', location: 'body', required: false, description: 'Required for plushie products.' },
  { name: 'colorVariations', type: '{ name: string; imageUrl?: string }[]', location: 'body', required: false, description: 'Required for plushie products. Each color can optionally include an uploaded bucket image URL.' },
  { name: 'pdfKey', type: 'string', location: 'body', required: false, description: 'Required for pattern products.' },
];

const cartFields: ApiFieldDoc[] = [
  { name: 'productId', type: 'string', location: 'body', required: true, description: 'Product to add to or remove from the cart.' },
  { name: 'quantity', type: 'number', location: 'body', required: false, description: 'Quantity to add. Defaults to 1.' },
  { name: 'colorVariation', type: 'string', location: 'body', required: false, description: 'Selected plushie color variation.' },
  { name: 'clientInstructions', type: 'string', location: 'body', required: false, description: 'Shopper notes for this cart item.' },
  { name: 'session_cookie', type: 'string', location: 'cookie', required: false, description: 'Guest cart cookie.' },
  { name: 'client_cookie', type: 'string', location: 'cookie', required: false, description: 'Logged-in user cookie. Takes precedence over session_cookie.' },
];

const shopProductQueryFields: ApiFieldDoc[] = [
  { name: 'batchSize', type: 'number', location: 'query', required: false, description: 'Positive page size. Defaults to 20.' },
  { name: 'afterId', type: 'string', location: 'query', required: false, description: 'Returns products after this product id.' },
  { name: 'type', type: "'plushie' | 'pattern' | 'all'", location: 'query', required: false, description: 'Product type filter for /api/shop/products.' },
  { name: 'sort', type: "'createdAt' | 'price' | 'title'", location: 'query', required: false, description: 'Sort key.' },
  { name: 'direction', type: "'asc' | 'desc'", location: 'query', required: false, description: 'Sort direction.' },
  { name: 'saleOnly', type: 'boolean', location: 'query', required: false, description: 'Only return sale items.' },
  { name: 'color', type: 'string', location: 'query', required: false, description: 'Plushie color filter.' },
  { name: 'size', type: 'ProductSize', location: 'query', required: false, description: 'Product size filter.' },
];

export const apiDocs: ApiDocsResponse = {
  title: 'K Suite Backend API',
  version: 1,
  basePath: '/api',
  endpoints: [
    {
      method: 'GET',
      path: '/api/docs',
      summary: 'Returns this machine-readable API documentation.',
      auth: 'None.',
      responses: [{ status: 200, description: 'API documentation.', body: 'ApiDocsResponse' }],
    },
    {
      method: 'GET',
      path: '/api/health',
      summary: 'Backend health check.',
      auth: 'None.',
      responses: [{ status: 200, description: 'Backend is running.', body: '{ status: string; timestamp: string }' }],
    },
    {
      method: 'POST',
      path: '/api/admin/login',
      summary: 'Authenticate an admin and set an admin cookie.',
      auth: 'None.',
      contentType: 'application/json',
      fields: [
        { name: 'email', type: 'string', location: 'body', required: true, description: 'Admin email.' },
        { name: 'password', type: 'string', location: 'body', required: true, description: 'Admin password.' },
      ],
      setsCookies: ['admin_cookie'],
      responses: [
        { status: 200, description: 'Admin login succeeded.', body: '{ admin: { email: string; name: string }; cookie: string }' },
        { status: 401, description: 'Invalid admin credentials.' },
      ],
    },
    {
      method: 'GET',
      path: '/api/admin/orders',
      summary: 'List all orders for admins.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      fields: [
        { name: 'admin_cookie', type: 'string', location: 'cookie', required: true, description: 'Admin session cookie.' },
        { name: 'x-admin-cookie', type: 'string', location: 'header', required: false, description: 'Alternative admin cookie header.' },
      ],
      responses: [
        { status: 200, description: 'Orders returned.', body: '{ orders: OrderRecord[] }' },
        { status: 401, description: 'Admin access required.' },
      ],
    },
    {
      method: 'PATCH',
      path: '/api/admin/orders/:orderId/status',
      summary: 'Update an order status, including marking an order fulfilled/shipped.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      contentType: 'application/json',
      fields: [
        { name: 'orderId', type: 'string', location: 'path', required: true, description: 'Order id to update.' },
        { name: 'status', type: "'pending' | 'paid' | 'fulfilled' | 'shipped' | 'cancelled'", location: 'body', required: true, description: 'New order status.' },
      ],
      responses: [{ status: 200, description: 'Order status updated.', body: '{ order: OrderRecord }' }],
    },
    {
      method: 'GET',
      path: '/api/admin/products',
      summary: 'List all products for admin editing, including unavailable products.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      responses: [{ status: 200, description: 'Products returned.', body: '{ products: Product[] }' }],
    },
    {
      method: 'POST',
      path: '/api/admin/products',
      summary: 'Create a product.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      contentType: 'application/json',
      fields: [{ name: 'admin_cookie', type: 'string', location: 'cookie', required: true, description: 'Admin session cookie.' }, ...productFields],
      responses: [
        { status: 201, description: 'Product created.', body: '{ product: Product }' },
        { status: 401, description: 'Admin access required.' },
      ],
    },
    {
      method: 'PATCH',
      path: '/api/admin/products/:productId',
      summary: 'Update an existing product.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      contentType: 'application/json',
      fields: [
        { name: 'productId', type: 'string', location: 'path', required: true, description: 'Product id to update.' },
        { name: 'admin_cookie', type: 'string', location: 'cookie', required: true, description: 'Admin session cookie.' },
        { name: 'title', type: 'string', location: 'body', required: false, description: 'Updated product title.' },
        { name: 'price', type: 'number', location: 'body', required: false, description: 'Updated product price.' },
        { name: 'description', type: 'string', location: 'body', required: false, description: 'Updated product description.' },
        { name: 'thumbnailImage', type: 'string', location: 'body', required: false, description: 'Updated thumbnail image URL or object key.' },
        { name: 'available', type: 'boolean', location: 'body', required: false, description: 'Updated availability.' },
        { name: 'readyToShip', type: 'boolean', location: 'body', required: false, description: 'Updated plushie shipping status.' },
        { name: 'colorVariations', type: '{ name: string; imageUrl?: string }[]', location: 'body', required: false, description: 'Updated plushie color variations and optional uploaded bucket image URLs.' },
        { name: 'pdfKey', type: 'string', location: 'body', required: false, description: 'Updated pattern PDF key.' },
      ],
      responses: [
        { status: 200, description: 'Product updated.', body: '{ product: Product }' },
        { status: 401, description: 'Admin access required.' },
      ],
    },
    {
      method: 'DELETE',
      path: '/api/admin/products/:productId',
      summary: 'Delete a product.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      fields: [
        { name: 'productId', type: 'string', location: 'path', required: true, description: 'Product id to delete.' },
        { name: 'admin_cookie', type: 'string', location: 'cookie', required: true, description: 'Admin session cookie.' },
      ],
      responses: [
        { status: 204, description: 'Product deleted.' },
        { status: 401, description: 'Admin access required.' },
      ],
    },
    {
      method: 'POST',
      path: '/api/admin/photos/:category',
      summary: 'Upload a public product or blog photo.',
      auth: 'Currently not checked by this route.',
      contentType: 'multipart/form-data',
      fields: [
        { name: 'category', type: "'product' | 'blog'", location: 'path', required: true, description: 'Photo category.' },
        { name: 'file', type: 'File', location: 'formData', required: true, description: 'Image file to upload.' },
      ],
      responses: [
        { status: 201, description: 'Photo uploaded.', body: '{ bucket: string; key: string; publicUrl: string }' },
        { status: 400, description: 'Missing file or invalid category.' },
      ],
    },
    {
      method: 'DELETE',
      path: '/api/admin/photos/:category/*key',
      summary: 'Delete a public product or blog photo by object key.',
      auth: 'Currently not checked by this route.',
      fields: [
        { name: 'category', type: "'product' | 'blog'", location: 'path', required: true, description: 'Photo category.' },
        { name: 'key', type: 'string', location: 'path', required: true, description: 'Object key path to delete.' },
      ],
      responses: [
        { status: 204, description: 'Photo deleted.' },
        { status: 400, description: 'Missing object key or invalid category.' },
      ],
    },
    {
      method: 'POST',
      path: '/api/admin/pdfs/patterns',
      summary: 'Upload a private pattern PDF.',
      auth: 'Currently not checked by this route.',
      contentType: 'multipart/form-data',
      fields: [{ name: 'file', type: 'File', location: 'formData', required: true, description: 'PDF file to upload.' }],
      responses: [
        { status: 201, description: 'Pattern PDF uploaded.', body: '{ bucket: string; key: string }' },
        { status: 400, description: 'Missing file.' },
      ],
    },
    {
      method: 'DELETE',
      path: '/api/admin/pdfs/patterns/*key',
      summary: 'Delete a private pattern PDF by object key.',
      auth: 'Currently not checked by this route.',
      fields: [{ name: 'key', type: 'string', location: 'path', required: true, description: 'Object key path to delete.' }],
      responses: [
        { status: 204, description: 'Pattern PDF deleted.' },
        { status: 400, description: 'Missing object key.' },
      ],
    },
    {
      method: 'GET',
      path: '/api/admin/service-health',
      summary: 'Return service health for admin server metrics.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      responses: [{ status: 200, description: 'Service health returned.', body: '{ health: ServiceHealthReport }' }],
    },
    {
      method: 'GET',
      path: '/api/admin/blog/articles',
      summary: 'List blog articles for admin editing.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      responses: [{ status: 200, description: 'Blog articles returned.', body: '{ articles: BlogArticleRecord[] }' }],
    },
    {
      method: 'POST',
      path: '/api/admin/blog/articles',
      summary: 'Create a block-based blog article.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      contentType: 'application/json',
      responses: [{ status: 201, description: 'Blog article created.', body: '{ article: BlogArticleRecord }' }],
    },
    {
      method: 'PATCH',
      path: '/api/admin/blog/articles/:articleId',
      summary: 'Update a blog article.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      contentType: 'application/json',
      responses: [{ status: 200, description: 'Blog article updated.', body: '{ article: BlogArticleRecord }' }],
    },
    {
      method: 'DELETE',
      path: '/api/admin/blog/articles/:articleId',
      summary: 'Delete a blog article.',
      auth: 'Requires admin_cookie cookie or x-admin-cookie header.',
      responses: [{ status: 204, description: 'Blog article deleted.' }],
    },
    {
      method: 'GET',
      path: '/api/shop/plushies',
      summary: 'List available plushie products.',
      auth: 'None.',
      fields: shopProductQueryFields,
      responses: [{ status: 200, description: 'Plushie products returned.', body: '{ products: Product[] }' }],
    },
    {
      method: 'POST',
      path: '/api/shop/plushies',
      summary: 'Add a plushie to a guest or user cart.',
      auth: 'Optional session_cookie or client_cookie.',
      contentType: 'application/json',
      fields: cartFields,
      setsCookies: ['session_cookie', 'client_cookie'],
      responses: [{ status: 200, description: 'Cart updated.', body: '{ cart: CartItemInput[] }' }],
    },
    {
      method: 'DELETE',
      path: '/api/shop/plushies',
      summary: 'Remove a plushie from a guest or user cart.',
      auth: 'Optional session_cookie or client_cookie.',
      contentType: 'application/json',
      fields: cartFields.filter((field) => ['productId', 'session_cookie', 'client_cookie'].includes(field.name)),
      setsCookies: ['session_cookie', 'client_cookie'],
      responses: [{ status: 200, description: 'Cart updated.', body: '{ cart: CartItemInput[] }' }],
    },
    {
      method: 'GET',
      path: '/api/shop/patterns',
      summary: 'List available pattern products.',
      auth: 'None.',
      fields: shopProductQueryFields,
      responses: [{ status: 200, description: 'Pattern products returned.', body: '{ products: Product[] }' }],
    },
    {
      method: 'POST',
      path: '/api/shop/patterns',
      summary: 'Add a pattern to a guest or user cart.',
      auth: 'Optional session_cookie or client_cookie.',
      contentType: 'application/json',
      fields: cartFields,
      setsCookies: ['session_cookie', 'client_cookie'],
      responses: [{ status: 200, description: 'Cart updated.', body: '{ cart: CartItemInput[] }' }],
    },
    {
      method: 'DELETE',
      path: '/api/shop/patterns',
      summary: 'Remove a pattern from a guest or user cart.',
      auth: 'Optional session_cookie or client_cookie.',
      contentType: 'application/json',
      fields: cartFields.filter((field) => ['productId', 'session_cookie', 'client_cookie'].includes(field.name)),
      setsCookies: ['session_cookie', 'client_cookie'],
      responses: [{ status: 200, description: 'Cart updated.', body: '{ cart: CartItemInput[] }' }],
    },
    {
      method: 'GET',
      path: '/api/shop/products',
      summary: 'List available shop products with filters, sorts, and cursor pagination.',
      auth: 'None.',
      fields: shopProductQueryFields,
      responses: [{ status: 200, description: 'Filtered product batch returned.', body: 'ShopProductBatchResponse' }],
    },
    {
      method: 'GET',
      path: '/api/shop/cart',
      summary: 'Read the current guest or authenticated cart with product snapshots and totals.',
      auth: 'Optional session_cookie or client_cookie.',
      responses: [{ status: 200, description: 'Cart snapshot returned.', body: 'CartSnapshot' }],
    },
    {
      method: 'PATCH',
      path: '/api/shop/cart/items/:itemId',
      summary: 'Update one cart line item by variant-safe item id.',
      auth: 'Optional session_cookie or client_cookie with CSRF token.',
      contentType: 'application/json',
      responses: [{ status: 200, description: 'Updated cart snapshot returned.', body: 'CartSnapshot' }],
    },
    {
      method: 'POST',
      path: '/api/shop/checkout/estimate',
      summary: 'Estimate shipping, tax, and grand total for the current cart.',
      auth: 'Optional session_cookie or client_cookie.',
      contentType: 'application/json',
      responses: [{ status: 200, description: 'Checkout estimate returned.', body: 'CheckoutEstimateResponse' }],
    },
    {
      method: 'POST',
      path: '/api/shop/checkout',
      summary: 'Create a pending order from the current cart without capturing payment.',
      auth: 'Optional session_cookie or client_cookie with CSRF token; patterns require client_cookie.',
      contentType: 'application/json',
      responses: [{ status: 201, description: 'Pending checkout order created or idempotent result returned.', body: 'CheckoutResult' }],
    },
    {
      method: 'GET',
      path: '/api/user/auth',
      summary: 'Log in a user with email and password query parameters.',
      auth: 'None.',
      fields: [
        { name: 'email', type: 'string', location: 'query', required: true, description: 'User email.' },
        { name: 'password', type: 'string', location: 'query', required: true, description: 'User password.' },
      ],
      setsCookies: ['client_cookie'],
      responses: [
        { status: 200, description: 'User login succeeded.', body: '{ user: PublicUser; cookie: string }' },
        { status: 401, description: 'Invalid user credentials.' },
      ],
    },
    {
      method: 'POST',
      path: '/api/user/auth',
      summary: 'Register a user and merge any guest cart from session_cookie.',
      auth: 'Optional session_cookie.',
      contentType: 'application/json',
      fields: [
        { name: 'email', type: 'string', location: 'body', required: true, description: 'User email.' },
        { name: 'name', type: 'string', location: 'body', required: true, description: 'User display name.' },
        { name: 'password', type: 'string', location: 'body', required: true, description: 'User password.' },
        { name: 'session_cookie', type: 'string', location: 'cookie', required: false, description: 'Guest cart cookie to merge.' },
      ],
      setsCookies: ['client_cookie'],
      responses: [
        { status: 201, description: 'User registered.', body: '{ user: PublicUser; cookie: string }' },
        { status: 400, description: 'Missing required user fields.' },
      ],
    },
    {
      method: 'POST',
      path: '/api/user/login',
      summary: 'Log in a user with email and password JSON body.',
      auth: 'None.',
      contentType: 'application/json',
      fields: [
        { name: 'email', type: 'string', location: 'body', required: true, description: 'User email.' },
        { name: 'password', type: 'string', location: 'body', required: true, description: 'User password.' },
      ],
      setsCookies: ['client_cookie'],
      responses: [
        { status: 200, description: 'User login succeeded.', body: 'ClientSessionState' },
        { status: 401, description: 'Invalid user credentials.' },
        { status: 429, description: 'Too many login attempts.' },
      ],
    },
    {
      method: 'POST',
      path: '/api/user/logout',
      summary: 'Log out the current client user and clear client_cookie.',
      auth: 'Optional client_cookie.',
      clearsCookies: ['client_cookie'],
      responses: [{ status: 204, description: 'Client session cleared.' }],
    },
    {
      method: 'GET',
      path: '/api/user/csrf',
      summary: 'Issue a double-submit CSRF token for cookie-authenticated mutating requests.',
      auth: 'None.',
      setsCookies: ['csrf_token'],
      responses: [{ status: 200, description: 'CSRF token issued.', body: '{ token: string; headerName: string }' }],
    },
    {
      method: 'GET',
      path: '/api/user/session',
      summary: 'Return current client session state from client_cookie or guest state from session_cookie.',
      auth: 'Optional client_cookie or session_cookie.',
      fields: [
        { name: 'client_cookie', type: 'string', location: 'cookie', required: false, description: 'Authenticated user session cookie.' },
        { name: 'session_cookie', type: 'string', location: 'cookie', required: false, description: 'Guest cart session cookie.' },
      ],
      responses: [{ status: 200, description: 'Session state returned.', body: 'ClientSessionState' }],
    },
    {
      method: 'GET',
      path: '/api/user/profile',
      summary: 'Read a user profile and order history.',
      auth: 'Requires client_cookie.',
      fields: [
        { name: 'email', type: 'string', location: 'query', required: true, description: 'User email.' },
        { name: 'client_cookie', type: 'string', location: 'cookie', required: true, description: 'User session cookie.' },
      ],
      responses: [
        { status: 200, description: 'Profile returned.', body: '{ user: PublicUser; orders: OrderRecord[] }' },
        { status: 401, description: 'Missing or invalid client cookie.' },
      ],
    },
    {
      method: 'POST',
      path: '/api/user/profile',
      summary: 'Update a user profile.',
      auth: 'Requires client_cookie.',
      contentType: 'application/json',
      fields: [
        { name: 'email', type: 'string', location: 'body', required: true, description: 'User email.' },
        { name: 'client_cookie', type: 'string', location: 'cookie', required: true, description: 'User session cookie.' },
        { name: 'name', type: 'string', location: 'body', required: false, description: 'Updated display name.' },
        { name: 'password', type: 'string', location: 'body', required: false, description: 'Updated password.' },
        { name: 'cart', type: 'unknown[]', location: 'body', required: false, description: 'Updated cart.' },
        { name: 'pdfKeys', type: 'string[]', location: 'body', required: false, description: 'Updated owned pattern PDF keys.' },
      ],
      responses: [
        { status: 200, description: 'User updated.', body: '{ user: PublicUser }' },
        { status: 401, description: 'Missing or invalid client cookie.' },
      ],
    },
    {
      method: 'DELETE',
      path: '/api/user/profile',
      summary: 'Delete a user profile.',
      auth: 'Requires client_cookie.',
      contentType: 'application/json',
      fields: [
        { name: 'email', type: 'string', location: 'body', required: true, description: 'User email.' },
        { name: 'client_cookie', type: 'string', location: 'cookie', required: true, description: 'User session cookie.' },
      ],
      clearsCookies: ['client_cookie'],
      responses: [
        { status: 204, description: 'User deleted.' },
        { status: 401, description: 'Missing or invalid client cookie.' },
      ],
    },
  ],
};

export function createDocsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(apiDocs);
  });

  return router;
}

export const docsRouter = createDocsRouter();
