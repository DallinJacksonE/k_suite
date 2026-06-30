# Client Commerce Frontend and Backend Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the customer storefront flow: browse shop, guest cart/session checkout, authenticated profile and pattern downloads, cart/checkout preparation, product filters/sorting, markets calendar, email notifications, shipping estimates, and sales-tax calculation.

**Architecture:** Keep the client frontend in the MVP shape already prepared: thin React route views under `client/src/view/`, reusable UI under `client/src/components/`, presenter behavior under `client/src/presenters/`, and API transport under `client/src/service/`. Backend changes should evolve shared DTOs in `shared/src/`, keep route handlers small, and put persistence/business rules in `backend/src/db/mariadb_access.ts` plus `backend/src/db/mariadb_service.ts`.

**Tech Stack:** React 19, React Router, Vite, TypeScript, Express 5, MariaDB, MinIO private bucket for pattern PDFs, Node test runner, shared TypeScript DTO package.

---

## Current Context

Observed repo state relevant to this plan:

- Client shell exists and currently routes `/` to `client/src/view/ClientHomeView.tsx` through `client/src/App.tsx`.
- Client service scaffold exists at `client/src/service/ClientApiService.ts` and currently only calls `/api/health`.
- Backend already has:
  - User routes in `backend/src/routes/userRoutes.ts`.
  - Shop routes in `backend/src/routes/shopRoutes.ts`.
  - Admin product routes in `backend/src/routes/adminRouter.ts`.
  - Product/user/order shared DTOs in `shared/src/products.ts` and `shared/src/mariadb.ts`.
  - MariaDB persistence in `backend/src/db/mariadb_service.ts`.
  - Business/access behavior in `backend/src/db/mariadb_access.ts`.
  - Private pattern PDF uploads through `backend/src/db/minIo.ts`, but no buyer-only presigned download route yet.
- Existing cookies are set with `httpOnly` and `sameSite: 'lax'`, but no explicit two-hour max age, no inactive-expiry validation, and no refresh-on-use behavior yet.
- Existing user login uses `GET /api/user/auth?email=...&password=...`; this should be replaced or supplemented with a POST login endpoint before building a real client UI because passwords should not travel in query strings.
- Existing profile returns `user` and `orders`, but not billing/shipping info or downloadable purchased pattern links.
- Existing product DTOs do not yet include sale item state, size, searchable color metadata beyond color variations, inventory/stock, or filter/sort query contracts.
- Existing shop batch API supports `batchSize` and `afterId`, but not sort/filter inputs.
- Existing order status values are `pending | paid | fulfilled | cancelled`; the user requirement mentions shipped, so we need either a `shipped` status or a separate shipping/fulfillment state.

---

## Recommended Major Design Decisions

These are the working decisions for implementation unless the user overrides them before the relevant phase starts.

1. **Checkout identity for guests: use order contact/customer snapshots**
   - Guest checkout needs an email to receive order updates and receipts.
   - Current `orders.client_email` has a foreign key to `users.email`, so guest checkout cannot be represented without either creating guest users, relaxing the FK, or adding a separate customer/contact model.
   - Decision: add an order contact/customer snapshot model for checkout contact, shipping, and billing data. Keep registered `users` as optional owners instead of forcing all guest buyers into the `users` table.

2. **Pattern purchase access: authorize through purchase records and short-lived links**
   - Guests cannot buy patterns.
   - Logged-in users can buy patterns and later download purchased patterns.
   - Decision: create a `purchased_patterns` table keyed by user email + product id/order id + private bucket key. Profile endpoint returns metadata only; a separate download endpoint returns short-lived presigned URLs only after authorization.

3. **Cart storage: token-only cookie plus server-side cart**
   - Requirement says guest cart is saved to a session cookie. Current implementation stores a guest cart in DB keyed by `session_cookie`, while the cookie stores only the token.
   - Decision: keep token-only cookie + DB cart. Do not store full cart JSON in the cookie; it risks size limits, tampering, and stale price data.

4. **Shipping and tax providers: define interfaces now, plug providers later**
   - Payment API comes later, but tax/shipping estimates need contracts now.
   - Decision: define provider interfaces now and start with deterministic local implementations. Later replace with real providers without changing presenters/views.

5. **Cookie inactivity lifespan: server-authoritative two-hour inactivity expiry**
   - Two-hour inactive lifespan means the server must validate `last_seen_at`, not just rely on browser `Max-Age`.
   - Decision: add `last_seen_at` and `expires_at` to cookies/guest sessions, refresh on authenticated/cart/profile/shop activity, and reject expired cookies server-side.

6. **Cookie-authenticated mutation safety: add explicit CSRF posture**
   - Cookie auth means browser requests can carry credentials automatically.
   - Decision: centralize mutating client API requests around a CSRF strategy. Prefer a double-submit CSRF token if the implementation has enough time; otherwise document why `SameSite=Lax` is acceptable for the current MVP routes and leave a clear upgrade task.

7. **Duplicate checkout prevention: require idempotency keys**
   - Checkout submission can be retried by the browser, user, or later payment provider callbacks.
   - Decision: require an idempotency key on checkout creation before payment integration so duplicate submits cannot create duplicate orders.

8. **Historical order accuracy: snapshot order data at creation**
   - Product titles, prices, sale state, selected variants, addresses, taxes, and shipping can change after purchase.
   - Decision: snapshot line-item details, contact information, addresses, tax, shipping, discounts, and totals when creating an order.

9. **Market calendar data: backend-owned with optional admin management**
   - Hardcoding markets in the client would create re-deploy work for routine event updates.
   - Decision: serve markets from backend data. Add admin management if it fits the implementation window; otherwise seed/configure events server-side first with the same public API contract.

10. **Account deletion: anonymize business records, delete user-owned profile data**
    - Orders may need to remain for business/accounting reasons even after account deletion.
    - Decision: delete or clear profile/session/address-book data while retaining historical order snapshots with personally identifying fields anonymized where legally and operationally safe.

---

## Cross-Cutting Requirements Added to the Plan

These requirements are folded into the phase checklists below rather than being left as separate ideas:

- Add POST login/logout endpoints; avoid password-in-query URLs.
- Add CSRF strategy for cookie-authenticated mutating requests. Prefer double-submit CSRF token; at minimum document why `SameSite=Lax` is enough for current flows.
- Add rate limiting or throttling for login/register/checkout attempts.
- Add inventory/stock rules so users cannot buy unavailable or sold-out physical items.
- Snapshot product price, title, selected options, shipping address, billing address, tax, shipping, and totals at order creation so historical orders remain stable after admin edits products.
- Add checkout idempotency keys before payment API/webhooks so duplicate submits do not create duplicate orders.
- Add email templates and an email delivery abstraction with test/dry-run implementation.
- Add privacy/account-deletion semantics: anonymize retained order snapshots where appropriate and remove user-owned profile/session data.
- Add accessibility requirements for modal product configuration, navbar, cart, and profile pages.
- Add mobile-first responsive states and loading/empty/error states for every route.
- Add admin support for markets calendar entries instead of hardcoding markets in the client when implementation time allows.
- Add docs route updates for every new backend route so the admin/server metrics panel stays accurate.

---

# Implementation Phases

## Phase 1: Shared DTO and Contract Foundation

**Status:** Implemented on 2026-06-30. Shared contract test, shared build, backend tests, admin build, and client build passed.

### Task 1.1: Add customer-facing shared domain types

**Objective:** Define the types every package will share before implementing routes or UI.

**Files:**

- Modify: `shared/src/products.ts`
- Modify: `shared/src/mariadb.ts`
- Modify: `shared/src/index.ts` if new files are split out
- Test: shared TypeScript build

**Checklist:**

- Add `ProductSize`, `ProductSortKey`, `ProductSortDirection`, `ShopProductFilters`, `ShopProductBatchRequest`, `ShopProductBatchResponse`.
- Add product fields:
  - `salePrice?: number`
  - `isSaleItem: boolean`
  - `sizes: ProductSize[]`
  - `tags?: string[]`
  - `inventoryCount?: number`
- Add cart item option shape:
  - `selectedColor?: string`
  - `selectedSize?: ProductSize`
  - `quantity`
  - `clientInstructions`
- Add checkout/address types:
  - `ShippingAddress`
  - `BillingAddress`
  - `CheckoutContact`
  - `OrderContactSnapshot`
  - `OrderLineItemSnapshot`
  - `CheckoutTotals`
  - `CheckoutEstimate`
  - `CheckoutRequest`
  - `CheckoutResult`
  - `CheckoutIdempotencyKey`
- Add profile types:
  - `UserAddressBook`
  - `UserProfileDetails`
  - `PurchasedPatternDownload`
  - `ClientProfileResponse`
- Add market calendar types:
  - `MarketEvent`
  - `MarketEventResponse`
- Add security/session types if shared contracts need them:
  - `CsrfTokenResponse`
  - `RateLimitErrorResponse`
- Add email notification type names for order events.

**Verification:**

- Run `cd shared && npm run build`.
- Expected: TypeScript build passes.

### Task 1.2: Rebuild dependent packages against shared DTOs

**Objective:** Ensure backend/admin/client can see the updated shared package types before feature work.

**Files:**

- No source changes unless compile failures reveal stale imports.

**Verification:**

- Run `cd shared && npm run build`.
- Run `cd backend && npm run build`.
- Run `cd admin && npm run build`.
- Run `cd client && npm run build`.

---

## Phase 2: Session and Auth Cookie Lifespan

**Status:** Implemented on 2026-06-30. Added server-side cookie/guest expiry fields, refresh-on-use behavior, centralized route cookie helpers, double-submit CSRF foundation, auth throttling, docs update, and passing backend/shared/admin/client verification.

### Task 2.1: Add server-side inactive-expiry fields

**Objective:** Persist two-hour inactive sessions and support refresh-on-use.

**Files:**

- Modify: `shared/src/mariadb.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Test: `backend/tests/mariadb_service.test.mjs`
- Test: `backend/tests/mariadb_access.test.mjs`

**Checklist:**

- Add `lastSeenAt` and `expiresAt` to `CookieRecord`.
- Add `lastSeenAt` and `expiresAt` to `GuestRecord` or track guest expiry separately.
- Update `CREATE TABLE cookies` with idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for `last_seen_at` and `expires_at`.
- Update `CREATE TABLE guests` with `last_seen_at` and `expires_at`.
- Add service methods:
  - `touchCookie(cookie: string, expiresAt: Date): Promise<void>`
  - `deleteExpiredCookies(now: Date): Promise<void>`
  - `touchGuest(guestCookie: string, expiresAt: Date): Promise<void>`
  - `deleteExpiredGuests(now: Date): Promise<void>`
- Update cookie lookup to treat expired cookies as invalid.

**Rules:**

- Lifespan is two hours since last active use.
- Browser cookie should be set with `maxAge: 2 * 60 * 60 * 1000`.
- Server `expires_at` is authoritative.
- Any authenticated/cart activity should refresh expiry.

**Verification:**

- Backend tests prove:
  - Fresh cookie is accepted.
  - Expired cookie is rejected.
  - Valid cookie is touched and `expires_at` moves forward.
  - Guest session expires independently.

### Task 2.2: Centralize cookie options and route cookie helpers

**Objective:** Avoid duplicating cookie behavior across routers.

**Files:**

- Create: `backend/src/routes/cookieHelpers.ts`
- Modify: `backend/src/routes/userRoutes.ts`
- Modify: `backend/src/routes/shopRoutes.ts`
- Modify: `backend/src/routes/adminRouter.ts`
- Test: route tests that assert `Max-Age`/`HttpOnly`/`SameSite`.

**Checklist:**

- Export `setSessionCookie`, `setClientCookie`, `setAdminCookie`, `clearClientCookie`, `readCookie` helpers.
- Use `httpOnly: true`, `sameSite: 'lax'`, `maxAge: TWO_HOURS_MS`.
- Set `secure` based on environment/config, not hardcoded.
- Keep names: `session_cookie`, `client_cookie`, `admin_cookie` unless deliberately renamed.

### Task 2.3: Add CSRF and auth/checkout throttling foundation

**Objective:** Make cookie-authenticated mutations and high-risk endpoints safe before building the client flows on top of them.

**Files:**

- Create: `backend/src/routes/csrfHelpers.ts`
- Create: `backend/src/routes/rateLimitHelpers.ts`
- Modify: `backend/src/routes/userRoutes.ts`
- Modify: `backend/src/routes/shopRoutes.ts`
- Modify: `backend/src/routes/docsRoutes.ts`
- Test: `backend/tests/user_shop_routes.test.mjs`

**Checklist:**

- Add a documented CSRF strategy for client mutating requests.
- Preferred implementation: double-submit CSRF token endpoint plus request header validation for POST/PATCH/DELETE routes that rely on cookies.
- If double-submit is deferred, document why `SameSite=Lax` is temporarily accepted and add a failing/skipped TODO test for stronger CSRF validation.
- Add lightweight in-process throttling helper for login/register/checkout attempts, or a narrow abstraction that can later move to Redis/MariaDB.
- Route tests cover missing/invalid CSRF token behavior where enabled.
- Route tests cover repeated login/register/checkout attempts returning a predictable rate-limit error shape.

---

## Phase 3: Auth Hook and Client Session Boundary

**Status:** Implemented on 2026-06-30. Added backend session/login/logout endpoints, client auth service contracts, client session provider/hook, client tests, and wrapped the app in the provider. Backend/shared/client/admin verification passed.

### Task 3.1: Add client auth service methods

**Objective:** Give presenters one service contract for session state.

**Files:**

- Modify: `client/src/service/ClientApiService.ts`
- Create: `client/src/service/ClientTypes.ts` if service file becomes too long
- Test: client presenter/service tests once test script is added

**Checklist:**

- Add methods:
  - `getSession(): Promise<ClientSessionState>`
  - `login(input: LoginInput): Promise<ClientSessionState>`
  - `register(input: RegisterInput): Promise<ClientSessionState>`
  - `logout(): Promise<void>`
  - `loadProfile(): Promise<ClientProfileResponse>`
- All requests use relative `/api` paths and `credentials: 'include'`.
- Mutating requests include the CSRF token/header required by the backend strategy from Task 2.3.
- Login/register/checkout calls surface rate-limit responses as user-friendly errors.

### Task 3.2: Add `useClientSession` hook

**Objective:** Let views know guest/logged-in capability without putting auth logic in each component.

**Files:**

- Create: `client/src/components/auth/ClientSessionProvider.tsx`
- Create: `client/src/components/auth/useClientSession.ts`
- Modify: `client/src/App.tsx`
- Test: client route/render tests if test tooling is introduced

**Checklist:**

- Provider owns current session state: `loading | guest | authenticated`.
- Provider exposes `canBuyPatterns`, `canViewProfile`, `refreshSession`, `login`, `logout`, `register`.
- `App.tsx` wraps routes in `ClientSessionProvider`.
- Guest users can browse and use cart.
- Pattern purchase/profile routes redirect or show login CTA when unauthenticated.

### Task 3.3: Add backend session-status and logout endpoints

**Objective:** Let the hook detect whether the client is logged in without requiring email in query params.

**Files:**

- Modify: `backend/src/routes/userRoutes.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `shared/src/mariadb.ts`
- Test: `backend/tests/user_shop_routes.test.mjs`
- Modify: `backend/src/routes/docsRoutes.ts`

**Checklist:**

- Add `GET /api/user/session` returning guest/authenticated state from cookies.
- Add `POST /api/user/login` with JSON body `{ email, password }`.
- Keep old `GET /api/user/auth` temporarily only if needed for compatibility, or remove and update docs/tests.
- Add `POST /api/user/logout` that clears `client_cookie` and leaves/creates guest cart behavior explicit.
- Remove password-in-query usage from new client code.

---

## Phase 4: Navbar, App Shell, and Route Skeletons

**Status:** Implemented on 2026-06-30. Added customer navbar, responsive app shell, route skeletons for Home/Shop/Markets/Cart/Profile/Login, authenticated profile redirect behavior, cart-count shell integration, and client shell tests. Client tests, lint, build, and Vite preview SPA fallback checks passed.

### Task 4.1: Create customer navbar and layout

**Objective:** Build a consistent shell for all client pages.

**Files:**

- Modify: `client/src/components/layout/ClientShell.tsx`
- Create: `client/src/components/layout/ClientNavbar.tsx`
- Create or modify: `client/src/components/layout/ClientShell.css`
- Modify: `client/src/view/ClientHomeView.css`

**Checklist:**

- Navbar links: Home, Shop, Markets, Cart, Profile/Login.
- Show cart count from session/cart state.
- Profile link only opens profile for authenticated users; otherwise show Login/Register CTA.
- Mobile menu state is accessible and keyboard usable.

### Task 4.2: Create route views

**Objective:** Establish page boundaries before filling behavior.

**Files:**

- Modify: `client/src/App.tsx`
- Create: `client/src/view/HomeView.tsx`
- Create: `client/src/view/ShopView.tsx`
- Create: `client/src/view/MarketsView.tsx`
- Create: `client/src/view/ProfileView.tsx`
- Create: `client/src/view/CartView.tsx`
- Create: `client/src/view/LoginView.tsx`
- Create: corresponding CSS files where needed

**Routes:**

- `/`
- `/shop`
- `/markets`
- `/cart`
- `/profile`
- `/login`

**Verification:**

- `cd client && npm run build`
- `cd client && npm run lint`
- Manual/browser check after implementation: every route renders through SPA fallback.

---

## Phase 5: Home Page

**Status:** Implemented on 2026-06-30. Added HomePresenter, home view model/service methods, featured product loading from the existing plushie list endpoint, a clearly marked temporary next-market placeholder, home CTAs, and home presenter/service tests. Backend market endpoints remain future work per the placeholder decision.

### Task 5.1: Implement home presenter/service slice

**Objective:** Keep home page data loading outside the React view.

**Files:**

- Create: `client/src/presenters/HomePresenter.ts`
- Modify: `client/src/service/ClientApiService.ts`
- Modify: `client/src/view/HomeView.tsx`

**Checklist:**

- Home page should show hero, featured products, next market, and CTAs.
- Service methods can call future endpoints:
  - `listFeaturedProducts()`
  - `getNextMarketEvent()`
- If endpoints are not ready in first frontend pass, show static placeholders behind presenter methods clearly named as temporary.

---

## Phase 6: Shop Batch API, Filters, Sorts, and Product Cards

**Status:** Implemented on 2026-06-30. Added product sale/size/tag/inventory persistence and admin editor support, filter/sort-aware `/api/shop/products`, inventory and guest-pattern cart enforcement, shop presenter/service methods, product cards, filter UI, accessible detail modal, load-more flow, and Phase 6 test coverage. Shared/backend/admin/client verification passed.

### Task 6.1: Extend product schema and admin product editor

**Objective:** Add sale, size, color-filter, and sort metadata to products.

**Files:**

- Modify: `shared/src/products.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `backend/src/routes/adminRouter.ts` if validation changes are needed
- Modify: `admin/src/service/AdminApiService.ts`
- Modify: `admin/src/presenter/AdminDashboardPresenter.ts`
- Modify: `admin/src/components/products/ProductDashboard.tsx`
- Test: `backend/tests/mariadb_service.test.mjs`
- Test: `backend/tests/admin_management_routes.test.mjs`

**Checklist:**

- Add columns with idempotent alters:
  - `sale_price DECIMAL(10,2) NULL`
  - `is_sale_item BOOLEAN NOT NULL DEFAULT FALSE`
  - `sizes JSON NULL`
  - `tags JSON NULL`
  - `inventory_count INT NULL`
- Admin create/edit form supports sale item, sale price, sizes, inventory.
- Product card summaries show sale state in admin.
- Access layer validates inventory before cart add/update and checkout creation.
- Physical products with `inventory_count = 0` cannot be purchased; `NULL` inventory means unlimited/made-to-order only if that is the chosen product rule.

### Task 6.2: Add filter/sort-aware shop API

**Objective:** Backend returns sorted/filtered batches instead of client sorting everything.

**Files:**

- Modify: `shared/src/products.ts`
- Modify: `backend/src/routes/shopRoutes.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `backend/src/routes/docsRoutes.ts`
- Test: `backend/tests/user_shop_routes.test.mjs`
- Test: `backend/tests/mariadb_access.test.mjs`

**API contract:**

- `GET /api/shop/products?type=plushie|pattern|all&batchSize=20&afterId=...&sort=price&direction=asc&saleOnly=true&color=red&size=medium`
- Return `{ products, nextCursor, hasMore, appliedFilters }`.

**Rules:**

- Unauthenticated users can browse all product listings but cannot add pattern products to cart.
- Backend enforces pattern cart restriction; frontend only improves UX.
- Filters are applied before pagination.
- Sorting is deterministic. Include `product_id` tiebreaker.

### Task 6.3: Build shop UI with cards and modal configuration

**Objective:** Let clients browse batches and configure add-to-cart options.

**Files:**

- Create: `client/src/components/shop/ProductCard.tsx`
- Create: `client/src/components/shop/ProductDetailModal.tsx`
- Create: `client/src/components/shop/ShopFilters.tsx`
- Create: `client/src/presenters/ShopPresenter.ts`
- Modify: `client/src/view/ShopView.tsx`
- Modify: `client/src/service/ClientApiService.ts`

**Checklist:**

- Cards show image, title, price/sale price, available colors/sizes, sale badge.
- Clicking a card opens accessible modal.
- Modal lets user choose available options and quantity.
- Pattern add-to-cart button requires login and shows CTA if guest.
- Plushies can be added by guests or logged-in users.
- Load More button requests next backend batch.
- Filters/sort reset pagination and call backend with query params.

---

## Phase 7: Cart and Guest Checkout Preparation

**Status:** Implemented on 2026-06-30. Added variant-safe cart read/update endpoints, product-snapshot cart responses, deterministic checkout estimates, guest pattern checkout blocking, cart page presenter/components, and service methods. Shared/backend/admin/client verification passed.

### Task 7.1: Add cart read/update endpoints

**Objective:** Cart page needs to load current cart, update quantities/options, and remove items.

**Files:**

- Modify: `backend/src/routes/shopRoutes.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `shared/src/mariadb.ts`
- Modify: `backend/src/routes/docsRoutes.ts`
- Test: `backend/tests/user_shop_routes.test.mjs`

**Checklist:**

- Add `GET /api/shop/cart`.
- Add `PATCH /api/shop/cart/items/:productId` or a safer item-id based contract if multiple options are possible.
- Existing add/remove route should be refined so variants do not accidentally remove all options of the same product.
- Cart response includes product snapshots needed to render totals, not just raw product ids.
- Cart refreshes cookie expiry on every read/write.

### Task 7.2: Build cart page and totals presenter

**Objective:** Show cart items, totals, shipping estimate placeholder, tax estimate placeholder, and checkout CTA.

**Files:**

- Create: `client/src/components/cart/CartItemRow.tsx`
- Create: `client/src/components/cart/CartSummary.tsx`
- Create: `client/src/presenters/CartPresenter.ts`
- Modify: `client/src/view/CartView.tsx`
- Modify: `client/src/service/ClientApiService.ts`

**Rules:**

- Guest checkout allowed for physical products when shipping and billing address are supplied.
- Guest checkout blocks pattern products.
- Logged-in checkout allows pattern products.
- Free shipping on orders over `$80` should be represented in totals even before payment API is added.

### Task 7.3: Add checkout estimate endpoint

**Objective:** Calculate shipping and tax before payment API exists.

**Files:**

- Create: `backend/src/checkout/shippingEstimator.ts`
- Create: `backend/src/checkout/taxCalculator.ts`
- Modify: `backend/src/routes/shopRoutes.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `shared/src/mariadb.ts`
- Test: backend checkout tests

**Checklist:**

- `POST /api/shop/checkout/estimate` accepts shipping/billing address and current cart context.
- Returns subtotal, discount/sale total, shipping, tax, grand total.
- Shipping is `0` when eligible subtotal is over `$80`.
- Tax uses state/region from address.
- Start with deterministic local tax table if no provider is selected yet.
- Keep provider interface so real tax service can replace local implementation later.

---

## Phase 8: Checkout Order Creation and Email Notifications ✅ Implemented 2026-06-30

### Task 8.1: Add checkout order endpoint without payment capture

**Objective:** Prepare order creation flow while payment API is deferred.

**Files:**

- Modify: `backend/src/routes/shopRoutes.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `shared/src/mariadb.ts`
- Test: backend checkout tests

**Checklist:**

- [x] Add `POST /api/shop/checkout`.
- [x] It accepts an idempotency key, shipping address, billing address, contact email/name, and payment placeholder token/status.
- [x] It rejects duplicate idempotency keys by returning the original checkout result instead of creating a second order.
- [x] It creates pending orders after validating cart, inventory, pattern eligibility, and totals.
- [x] It writes order contact/customer snapshot data so guest checkout does not require a `users.email` foreign key.
- [x] It snapshots line-item title, price, sale price, selected options, quantity, product type, private PDF key reference where applicable, shipping address, billing address, tax, shipping, discounts, and grand total.
- [x] It clears cart only after successful order creation.
- [x] It grants purchased pattern records only when order payment is confirmed later; for now define state and test pending behavior.

### Task 8.2: Add email notification abstraction

**Objective:** Send emails when orders are created/fulfilled/shipped without coupling routes to a provider.

**Files:**

- Create: `backend/src/email/EmailService.ts`
- Create: `backend/src/email/OrderEmailTemplates.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `backend/src/routes/adminRouter.ts`
- Test: backend email behavior tests with fake email service

**Events:**

- Order created.
- Order fulfilled.
- Order shipped.
- Order cancelled, if admin can cancel.

**Checklist:**

- [x] Use injectable email service in access layer.
- [x] Tests assert email service called with correct event and recipient.
- [x] Do not require real SMTP/API credentials in tests.
- [x] Add env config later for provider selection.

### Task 8.3: Add `shipped` status or shipment state

**Objective:** Match customer-visible order lifecycle.

**Files:**

- Modify: `shared/src/mariadb.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `admin/src/service/AdminApiService.ts`
- Modify: `admin/src/components/orders/OrdersDashboard.tsx`
- Test: order status tests

**Decision:**

- [x] Either extend `OrderStatus` to include `shipped`, or add `fulfillmentStatus` and `shipmentStatus` separately.
- [x] Recommended for now: add `shipped` to `OrderStatus` unless tracking carriers/tracking numbers is also added immediately.

**Implemented notes:** Added `shipped` to `OrderStatus`; `POST /api/shop/checkout` creates a pending, idempotent order snapshot without payment capture; order-created/status emails use an injectable backend email service with a no-op default.

---

## Phase 9: Purchased Pattern Downloads

### Task 9.1: Add purchased pattern persistence

**Objective:** Track which authenticated users can download which private PDF keys.

**Files:**

- Modify: `shared/src/mariadb.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Test: `backend/tests/mariadb_service.test.mjs`
- Test: `backend/tests/mariadb_access.test.mjs`

**Checklist:**

- Add `purchased_patterns` table:
  - `user_email`
  - `product_id`
  - `order_id`
  - `pdf_key`
  - `purchased_at`
- Add service methods to insert/list purchased pattern records.
- Stop relying on `users.pdf_keys` as the only purchase source, or migrate it to the new table.

### Task 9.2: Add presigned private download endpoint

**Objective:** Only buyers can get short-lived pattern PDF links.

**Files:**

- Modify: `backend/src/db/minIo.ts`
- Modify: `backend/src/routes/userRoutes.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `backend/src/routes/docsRoutes.ts`
- Test: backend route/access tests

**API contract:**

- `GET /api/user/purchased-patterns` returns purchased pattern metadata, no direct permanent private URL.
- `POST /api/user/purchased-patterns/:productId/download` returns `{ url, expiresAt }` if current `client_cookie` owns the purchase.

**Rules:**

- Presigned URL should be short-lived, e.g. 10 minutes.
- Server verifies `client_cookie` and purchase record before signing.
- Guest users cannot call this endpoint successfully.

### Task 9.3: Show downloads in profile page

**Objective:** Logged-in users can download purchased patterns from profile.

**Files:**

- Create: `client/src/components/profile/PurchasedPatternsPanel.tsx`
- Modify: `client/src/presenters/ProfilePresenter.ts`
- Modify: `client/src/view/ProfileView.tsx`
- Modify: `client/src/service/ClientApiService.ts`

**Checklist:**

- Profile lists purchased patterns with product title, purchase date, and download button.
- Download button requests presigned link on demand.
- UI explains link expiration.

---

## Phase 10: User Profile Page

### Task 10.1: Add backend profile fields

**Objective:** Store editable user info, billing info, and shipping info.

**Files:**

- Modify: `shared/src/mariadb.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Modify: `backend/src/db/mariadb_access.ts`
- Modify: `backend/src/routes/userRoutes.ts`
- Modify: `backend/src/routes/docsRoutes.ts`
- Test: profile tests

**Checklist:**

- Add columns or related table for:
  - display name
  - shipping address
  - billing address
  - marketing/email notification preference if desired
- Profile response includes user details, addresses, orders, purchased patterns metadata.
- Profile update validates address shape.
- Delete account clears client cookie.
- Delete account removes or clears user-owned profile/address/session records.
- Retained historical order records use checkout snapshots and should be anonymized where practical instead of retaining live profile data dependencies.

### Task 10.2: Build profile UI

**Objective:** Complete logged-in profile page.

**Files:**

- Create: `client/src/components/profile/ProfileInfoForm.tsx`
- Create: `client/src/components/profile/AddressForm.tsx`
- Create: `client/src/components/profile/OrderHistoryPanel.tsx`
- Create: `client/src/components/profile/DeleteAccountPanel.tsx`
- Create: `client/src/presenters/ProfilePresenter.ts`
- Modify: `client/src/view/ProfileView.tsx`
- Modify: `client/src/service/ClientApiService.ts`

**Checklist:**

- Profile route requires auth through `useClientSession`.
- User can edit name/password/address information.
- User can see order statuses.
- User can see purchased patterns and request downloads.
- Delete account requires explicit confirmation.
- After delete, clear session state and route home.

---

## Phase 11: Markets Calendar

### Task 11.1: Add market events backend/API

**Objective:** Serve market calendar data instead of hardcoding it.

**Files:**

- Modify or create: `shared/src/markets.ts`
- Modify: `shared/src/index.ts`
- Modify: `backend/src/db/mariadb_service.ts`
- Create: `backend/src/routes/marketRoutes.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/src/routes/docsRoutes.ts`
- Optional admin changes: admin market management components
- Test: backend market route tests

**Checklist:**

- Add market events table with title, location, startsAt, endsAt, description, externalUrl.
- Public endpoint: `GET /api/markets`.
- Public endpoint: `GET /api/markets/next`.
- Prefer admin-editable market events if implementation time allows; otherwise seed/configure initial events behind the same public API contract.
- If admin management is included, follow the existing admin inline/dropdown editor pattern rather than hardcoding markets in the client.

### Task 11.2: Build markets calendar page

**Objective:** Show upcoming markets and highlight the next market.

**Files:**

- Create: `client/src/components/markets/MarketCalendar.tsx`
- Create: `client/src/components/markets/NextMarketCard.tsx`
- Create: `client/src/presenters/MarketsPresenter.ts`
- Modify: `client/src/view/MarketsView.tsx`
- Modify: `client/src/service/ClientApiService.ts`

**Checklist:**

- Calendar/list view works on mobile.
- Next market is visually prominent.
- Empty state is friendly.

---

## Phase 12: Final Frontend Polish and Runtime Verification

### Task 12.1: Add client tests

**Objective:** Make presenter behavior testable without React DOM.

**Files:**

- Modify: `client/package.json`
- Create: `client/tests/*.test.ts`

**Checklist:**

- Install `tsx` as a dev dependency if not present.
- Add script: `"test": "node --import tsx --test tests/*.test.ts"`.
- Test presenters:
  - session presenter/hook service behavior where practical
  - shop presenter filter/batch behavior
  - cart totals and guest/pattern restrictions
  - profile presenter update/delete/download behavior

**Verification:**

- `cd client && npm test`
- `cd client && npm run build`
- `cd client && npm run lint`

### Task 12.2: Frontend accessibility, responsive, and state polish

**Objective:** Ensure every customer route is usable on mobile, keyboard-accessible, and clear in loading/empty/error states.

**Files:**

- Modify: `client/src/components/layout/ClientNavbar.tsx`
- Modify: `client/src/components/shop/ProductDetailModal.tsx`
- Modify: `client/src/components/cart/CartSummary.tsx`
- Modify: `client/src/components/profile/*`
- Modify: `client/src/view/*.tsx`
- Modify: related CSS files under `client/src/`

**Checklist:**

- Navbar supports keyboard navigation, visible focus, and accessible mobile menu labels/states.
- Product detail modal traps focus, closes on Escape, restores focus to the triggering product card, and has labelled title/content regions.
- Cart and checkout forms expose validation messages near fields and with accessible status text.
- Profile delete confirmation is explicit and keyboard usable.
- Every route has mobile-first layout behavior.
- Every async view has loading, empty, and error states.
- Product images, market details, order statuses, and download actions have useful text alternatives/labels.

**Verification:**

- `cd client && npm run build`
- Manual keyboard-only pass through Home, Shop modal, Cart, Login, Profile, Markets.
- Browser responsive pass at narrow mobile width and desktop width.

### Task 12.3: Full backend validation

**Objective:** Verify backend behavior with route/access tests and docs updates.

**Verification:**

- `cd shared && npm run build`
- `cd backend && npm test`
- `docker compose config`
- If Docker services are required for integration validation: `docker compose up -d --wait`, then hit:
  - `/api/health`
  - `/api/docs`
  - `/api/shop/products`
  - `/api/user/session`
  - `/api/markets/next`

### Task 12.4: End-to-end manual acceptance checklist

**Objective:** Confirm the user-facing flows work together.

**Manual checks:**

- Guest can browse home/shop/markets.
- Guest can add physical products to cart.
- Guest cannot add/buy patterns and sees login CTA.
- Guest cart persists through refresh via token-only session cookie with server-side cart data.
- Cookie expires after two inactive hours server-side.
- Active use refreshes cookie lifetime.
- Guest can checkout physical products with contact, shipping, and billing information once payment placeholder is enabled.
- Duplicate checkout submit with the same idempotency key does not create a second order.
- Login/register/checkout throttling returns predictable user-facing errors.
- Cookie-authenticated mutating routes follow the documented CSRF posture.
- Logged-in user can view/edit profile.
- Logged-in user can buy patterns.
- Purchased pattern appears in profile.
- Download button returns a short-lived presigned URL.
- Admin order status update triggers email notification.
- Shipping is free above $80.
- Tax is calculated from shipping/billing region according to the selected rule.
- Markets render from backend data, not hardcoded client data.
- Customer routes pass keyboard, mobile, loading, empty, and error-state checks.

---

## Risks and Tradeoffs

- **Guest checkout conflicts with current FK design.** The current order table requires `client_email` to reference `users.email`; guest checkout needs schema redesign or guest user creation.
- **Sales tax is compliance-sensitive.** A hardcoded local table may be acceptable for initial development, but production should use a provider or a clearly maintained jurisdiction table.
- **Shipping estimates can be wrong without package dimensions/weights.** Add product weight/dimensions if real carrier estimates are needed.
- **Presigned URLs must never be persisted in long-lived profile data.** Store private keys/purchase records only; generate links on demand.
- **Cookie refresh on every request can increase DB writes.** Consider throttling refresh to once every few minutes while still extending the two-hour inactivity window.
- **Pattern access should be granted by paid order state, not cart state.** Wait for payment confirmation/webhook before inserting purchase records once payment API is integrated.

---

## Open Questions

1. Confirm the preferred table/model name for guest checkout snapshots: `order_contacts`, `customers`, or another name.
2. Which state/region(s) do we need to collect/remit sales tax for initially?
3. Which shipping provider should we target later, or do we only need a flat-rate/free-over-$80 estimator for now?
4. Should order statuses be `pending | paid | fulfilled | shipped | cancelled`, or should payment/fulfillment/shipment be separate fields?
5. Do product sizes apply to all product types, plushies only, or future apparel/accessory products too?
6. Should admin-editable market events be included in this implementation window, or should we seed/configure events first behind the backend API?
7. What email provider do you want to use later: SMTP, Resend, SendGrid, SES, or another service?
8. Confirm account deletion policy details: anonymize retained order snapshots and delete user-owned profile/session/address data unless business/legal requirements say otherwise.

---

## Recommended Execution Order

1. Shared DTOs and backend session expiry.
2. POST auth/session endpoints and client `useClientSession`.
3. Navbar and route skeletons.
4. Shop filter/sort backend and admin product metadata.
5. Shop cards/modal/add-to-cart.
6. Cart page and checkout estimates.
7. Profile page and purchased pattern presigned downloads.
8. Markets calendar.
9. Email notifications and order status lifecycle.
10. End-to-end verification and polish.
