export type ProductType = 'plushie' | 'pattern';
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';
export interface UserRecord {
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    cart: unknown[];
    pdfKeys: unknown[];
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
    timeCreated: Date | string;
}
export interface GuestRecord {
    guestCookie: string;
    cart: unknown[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
export interface ProductRecord {
    productId: string;
    productType: ProductType;
    price: number;
    readyToShip: boolean;
    description: string;
    imageLinks: unknown[];
    colorVariations: Record<string, unknown>;
    pdfKey?: string | null;
    available: boolean;
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
export interface InsertUserInput {
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    cart?: unknown[];
    pdfKeys?: unknown[];
}
export interface InsertAdminInput {
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
}
export interface InsertProductInput {
    productId: string;
    productType: ProductType;
    price: number;
    readyToShip?: boolean;
    description: string;
    imageLinks?: unknown[];
    colorVariations?: Record<string, unknown>;
    pdfKey?: string | null;
    available?: boolean;
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
    pdfKeys?: unknown[];
}
export interface ProductPatch {
    productType?: ProductType;
    price?: number;
    readyToShip?: boolean;
    description?: string;
    imageLinks?: unknown[];
    colorVariations?: Record<string, unknown>;
    pdfKey?: string | null;
    available?: boolean;
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
    pdfKeys?: unknown[];
}
export interface PublicUser {
    email: string;
    name: string;
    cart: unknown[];
    pdfKeys: unknown[];
}
export interface UserProfile {
    user: PublicUser;
    orders: OrderRecord[];
}
export interface AccessResult {
    user: PublicUser;
    cookie: string;
}
export interface AccessRuntime {
    randomBytes?: (size: number) => string | Uint8Array;
    randomUUID?: () => string;
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
    upsertCookie(email: string, cookie: string): Promise<void>;
    findCookie(cookie: string): Promise<CookieRecord | null>;
    deleteCookie(cookie: string): Promise<void>;
    upsertGuestCart(guestCookie: string, cart: unknown[]): Promise<GuestRecord>;
    findGuestByCookie(guestCookie: string): Promise<GuestRecord | null>;
    deleteGuest(guestCookie: string): Promise<void>;
    insertProduct(input: InsertProductInput): Promise<ProductRecord>;
    findProductById(productId: string): Promise<ProductRecord | null>;
    listProducts(productType?: ProductType, includeUnavailable?: boolean): Promise<ProductRecord[]>;
    updateProduct(productId: string, patch: ProductPatch): Promise<ProductRecord>;
    removeProduct(productId: string): Promise<void>;
    insertOrder(input: InsertOrderInput): Promise<OrderRecord>;
    listOrdersForUser(email: string): Promise<OrderRecord[]>;
    listOrders(): Promise<OrderRecord[]>;
}
export interface MariaDbAccess {
    checkUserPassword(email: string, password: string): Promise<boolean>;
    addUser(userData: AddUserInput): Promise<AccessResult>;
    getUser(email: string, cookie: string): Promise<UserProfile>;
    updateUser(userData: UpdateUserInput, email: string, cookie: string): Promise<PublicUser>;
    deleteUser(email: string, cookie: string): Promise<void>;
    getOrders(adminCookie: string): Promise<OrderRecord[]>;
    newCookie(email: string, cookie?: string): Promise<string>;
    checkedout(email: string, cookie: string, paidAmount: number): Promise<OrderRecord[]>;
    addProduct(adminCookie: string, productDTO: InsertProductInput): Promise<ProductRecord>;
    editProduct(adminCookie: string, productId: string, productDTO: ProductPatch): Promise<ProductRecord>;
    removeProduct(adminCookie: string, productId: string): Promise<void>;
}
