import type { CreateProductInput, Product, ProductType, UpdateProductInput } from './products.js';

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';
export type CookieKind = 'session' | 'client' | 'admin';

export interface UserRecord {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  cart: unknown[];
  pdfKeys: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AdminRecord {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt?: Date | string;
}

export interface CookieRecord {
  email: string;
  cookie: string;
  kind: CookieKind;
  timeCreated: Date | string;
}

export interface GuestRecord {
  guestCookie: string;
  cart: unknown[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OrderRecord {
  orderId: string;
  productId: string;
  clientEmail: string;
  details: Record<string, unknown>;
  clientInstructions: string;
  chargedAmount: number;
  status: OrderStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BlogHeadingBlock { type: 'heading'; level: 1 | 2 | 3; text: string }
export interface BlogParagraphBlock { type: 'paragraph'; text: string }
export interface BlogImageBlock { type: 'image'; url: string; alt: string }
export interface BlogYoutubeBlock { type: 'youtube'; videoId: string; title?: string }
export type BlogArticleBlock = BlogHeadingBlock | BlogParagraphBlock | BlogImageBlock | BlogYoutubeBlock;

export interface BlogArticleRecord {
  articleId: string;
  title: string;
  slug: string;
  excerpt: string;
  blocks: BlogArticleBlock[];
  published: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateBlogArticleInput {
  title: string;
  slug: string;
  excerpt: string;
  blocks: BlogArticleBlock[];
  published?: boolean;
}

export interface UpdateBlogArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  blocks?: BlogArticleBlock[];
  published?: boolean;
}

export interface ServiceHealthCheck {
  name: string;
  status: 'ok' | 'error';
  message?: string;
}

export interface ServiceHealthReport {
  status: 'ok' | 'degraded';
  checkedAt: string;
  services: ServiceHealthCheck[];
}

export interface InsertUserInput {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  cart?: unknown[];
  pdfKeys?: string[];
}

export interface InsertAdminInput {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
}

export interface InsertOrderInput {
  orderId: string;
  productId: string;
  clientEmail: string;
  details?: Record<string, unknown>;
  clientInstructions?: string;
  chargedAmount: number;
  status?: OrderStatus;
}

export interface UserPatch {
  name?: string;
  passwordHash?: string;
  salt?: string;
  cart?: unknown[];
  pdfKeys?: string[];
}

export interface AddUserInput {
  email: string;
  name: string;
  password: string;
  guestCookie?: string;
}

export interface UpdateUserInput {
  name?: string;
  password?: string;
  cart?: unknown[];
  pdfKeys?: string[];
}

export interface PublicUser {
  email: string;
  name: string;
  cart: unknown[];
  pdfKeys: string[];
}

export interface UserProfile {
  user: PublicUser;
  orders: OrderRecord[];
}

export interface AccessResult {
  user: PublicUser;
  cookie: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginResult {
  admin: { email: string; name: string };
  cookie: string;
}

export interface AccessRuntime {
  randomBytes?: (size: number) => string | Uint8Array;
  randomUUID?: () => string;
}

export interface CartItemInput {
  productId: string;
  quantity?: number;
  colorVariation?: string;
  clientInstructions?: string;
}

export interface CartResult {
  cookie: string;
  cart: CartItemInput[];
  cookieName: 'session_cookie' | 'client_cookie';
}

export interface MariaDbServiceLike {
  initialize(): Promise<void>;
  close(): Promise<void>;
  insertAdmin(input: InsertAdminInput): Promise<AdminRecord>;
  findAdminByEmail(email: string): Promise<AdminRecord | null>;
  insertUser(input: InsertUserInput): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  updateUser(email: string, patch: UserPatch): Promise<UserRecord>;
  deleteUser(email: string): Promise<void>;
  upsertCookie(email: string, cookie: string, kind?: CookieKind): Promise<void>;
  findCookie(cookie: string): Promise<CookieRecord | null>;
  deleteCookie(cookie: string): Promise<void>;
  upsertGuestCart(guestCookie: string, cart: unknown[]): Promise<GuestRecord>;
  findGuestByCookie(guestCookie: string): Promise<GuestRecord | null>;
  deleteGuest(guestCookie: string): Promise<void>;
  insertProduct(input: CreateProductInput & { id: string }): Promise<Product>;
  findProductById(productId: string): Promise<Product | null>;
  listProducts(productType?: ProductType, includeUnavailable?: boolean): Promise<Product[]>;
  updateProduct(productId: string, patch: UpdateProductInput): Promise<Product>;
  removeProduct(productId: string): Promise<void>;
  insertOrder(input: InsertOrderInput): Promise<OrderRecord>;
  listOrdersForUser(email: string): Promise<OrderRecord[]>;
  listOrders(): Promise<OrderRecord[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderRecord>;
  listBlogArticles(): Promise<BlogArticleRecord[]>;
  insertBlogArticle(input: CreateBlogArticleInput & { articleId: string }): Promise<BlogArticleRecord>;
  updateBlogArticle(articleId: string, patch: UpdateBlogArticleInput): Promise<BlogArticleRecord>;
  deleteBlogArticle(articleId: string): Promise<void>;
}

export interface MariaDbAccess {
  checkUserPassword(email: string, password: string): Promise<boolean>;
  loginUser(input: UserLoginInput): Promise<AccessResult>;
  addUser(userData: AddUserInput): Promise<AccessResult>;
  getUser(email: string, cookie: string): Promise<UserProfile>;
  updateUser(userData: UpdateUserInput, email: string, cookie: string): Promise<PublicUser>;
  deleteUser(email: string, cookie: string): Promise<void>;
  getOrders(adminCookie: string): Promise<OrderRecord[]>;
  updateOrderStatus(adminCookie: string, orderId: string, status: OrderStatus): Promise<OrderRecord>;
  getServiceHealth(adminCookie: string): Promise<ServiceHealthReport>;
  newCookie(email: string, cookie?: string, kind?: CookieKind): Promise<string>;
  checkedout(email: string, cookie: string, paidAmount: number): Promise<OrderRecord[]>;
  adminLogin(input: AdminLoginInput): Promise<AdminLoginResult>;
  addProduct(adminCookie: string, productDTO: CreateProductInput): Promise<Product>;
  listAdminProducts(adminCookie: string): Promise<Product[]>;
  editProduct(adminCookie: string, productId: string, productDTO: UpdateProductInput): Promise<Product>;
  removeProduct(adminCookie: string, productId: string): Promise<void>;
  listBlogArticles(adminCookie: string): Promise<BlogArticleRecord[]>;
  createBlogArticle(adminCookie: string, input: CreateBlogArticleInput): Promise<BlogArticleRecord>;
  updateBlogArticle(adminCookie: string, articleId: string, input: UpdateBlogArticleInput): Promise<BlogArticleRecord>;
  deleteBlogArticle(adminCookie: string, articleId: string): Promise<void>;
  listShopProducts(productType: ProductType, batchSize?: number, afterId?: string): Promise<Product[]>;
  addCartItem(input: CartItemInput, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CartResult>;
  removeCartItem(productId: string, cookies: { sessionCookie?: string; clientCookie?: string }): Promise<CartResult>;
}
