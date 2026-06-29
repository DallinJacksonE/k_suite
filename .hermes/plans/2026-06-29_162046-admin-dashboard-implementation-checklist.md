# Admin Dashboard Implementation Checklist

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the next admin dashboard iteration: login-gated admin shell, componentized dashboard, left-column action navigation, order management, product/image management, blog article editing, and service health views.

**Architecture:** Keep the current MVP split. React components render and hold UI-local state, presenters own workflow behavior, and services own fetch/API calls. The current `AdminDashboardView.tsx` is intentionally too large and should be decomposed into `src/components/` while preserving the `/service`, `/presenter`, and `/views` boundaries.

**Tech Stack:** React 19, Vite 8, TypeScript, Express proxy server, backend `/api/*` endpoints, cookie-based admin auth.

---

## Current Context

- Admin frontend root: `admin/`
- Current app shell: `admin/src/App.tsx`
- Current large view to split: `admin/src/views/AdminDashboardView.tsx`
- Current presenter: `admin/src/presenter/AdminDashboardPresenter.ts`
- Current service: `admin/src/service/AdminApiService.ts`
- Current CSS: `admin/src/views/AdminDashboardView.css`, `admin/src/index.css`
- Existing backend routes currently exposed to the admin frontend include:
  - `POST /api/admin/login`
  - `GET /api/admin/orders`
  - `POST /api/admin/products`
  - `PATCH /api/admin/products/:productId`
  - `DELETE /api/admin/products/:productId`
  - `POST /api/admin/photos/:category`
  - `DELETE /api/admin/photos/:category/*key`
  - `POST /api/admin/pdfs/patterns`
  - `DELETE /api/admin/pdfs/patterns/*key`
  - `GET /api/health`
  - `GET /api/docs`
- Required dashboard categories:
  - Orders
  - Product
  - Blog Articles
  - Server Metrics

## Implementation Checklist

### Phase 1: Auth Gate and App Shell

- [x] Create `admin/src/components/`.
- [x] Create `admin/src/components/layout/`.
- [x] Create `admin/src/components/auth/`.
- [x] Extract login UI from `admin/src/views/AdminDashboardView.tsx` into `admin/src/components/auth/AdminLoginForm.tsx`.
- [ ] Add `AdminSession` state to `admin/src/views/AdminDashboardView.tsx` or a new shell view:
  - [ ] `adminName: string | null`
  - [ ] `isAuthenticated: boolean`
  - [ ] `busy: boolean`
  - [ ] `error: string | null`
- [x] Change the initial render so only the login form is visible before a successful `presenter.login(...)` result.
- [x] Ensure the dashboard shell is not mounted/rendered while `isAuthenticated === false`.
- [x] After successful login, render the admin dashboard shell and store/display the admin name.
- [ ] Add a logout/reset action if no backend logout exists:
  - [ ] Clear client-side admin state.
  - [ ] Display a note that backend cookie expiry/logout endpoint is not yet implemented.
- [ ] Update `AdminDashboardPresenter.login(...)` to notify the view with a richer admin session result instead of only `setAdminName`.
- [ ] Verification:
  - [ ] Login form is the only visible screen on initial load.
  - [ ] Invalid login keeps the dashboard hidden and shows an error.
  - [ ] Successful login reveals dashboard categories.
  - [ ] Run `npm run build` in `admin/`.
  - [ ] Run `npm run lint` in `admin/`.

### Phase 2: Componentize Current Dashboard

- [x] Create `admin/src/components/layout/AdminShell.tsx`.
- [x] Create `admin/src/components/layout/AdminSidebar.tsx`.
- [ ] Create `admin/src/components/layout/AdminTopBar.tsx`.
- [x] Create `admin/src/components/layout/StatusBanner.tsx`.
- [ ] Create `admin/src/components/layout/Panel.tsx` for repeated panel markup.
- [ ] Move reusable list display from `ResultList` in `AdminDashboardView.tsx` into `admin/src/components/common/ResultList.tsx`.
- [ ] Create `admin/src/components/common/LoadingButton.tsx` if button disabled/busy behavior repeats.
- [ ] Create `admin/src/components/common/FormField.tsx` only if it reduces duplication without hiding form semantics.
- [ ] Keep `AdminDashboardView.tsx` as the orchestration view only:
  - [ ] presenter creation
  - [ ] view contract attachment/detachment
  - [ ] top-level category selection
  - [ ] shared status/error/session state
- [ ] Move section CSS out of `AdminDashboardView.css` into component-adjacent CSS files only if the project accepts multiple CSS imports; otherwise group selectors clearly in one CSS file.
- [ ] Verification:
  - [ ] `AdminDashboardView.tsx` is small enough to scan quickly, ideally under ~150 lines.
  - [ ] No component imports from `service/` directly unless it is purely type-only and not business behavior.
  - [ ] Run `npm run build` in `admin/`.
  - [ ] Run `npm run lint` in `admin/`.

### Phase 3: Left Column Action Navigation

- [x] Define dashboard category type in a shared frontend file, for example `admin/src/components/layout/adminNavigation.ts`:
  - [ ] `'orders'`
  - [ ] `'product'`
  - [ ] `'blog'`
  - [ ] `'serverMetrics'`
- [x] Implement `AdminSidebar` as a stacked left column.
- [x] Add buttons/nav items for:
  - [ ] Orders
  - [ ] Product
  - [ ] Blog Articles
  - [ ] Server Metrics
- [x] Store active category in `AdminDashboardView.tsx`.
- [x] Render one category panel at a time in the main content region.
- [ ] Add accessible selected state:
  - [ ] `aria-current` or `aria-pressed`
  - [ ] visible selected style
- [ ] Ensure responsive behavior:
  - [ ] Desktop: left column fixed/sticky within dashboard shell.
  - [ ] Mobile: left column becomes top stacked nav or horizontal scroll.
- [ ] Verification:
  - [ ] Clicking each category changes the visible management area.
  - [ ] Keyboard navigation can focus every category button.
  - [ ] Run `npm run build` and `npm run lint`.

### Phase 4: Orders Components and Backend Contract

Current backend likely only supports `GET /api/admin/orders`. Marking shipped/status updates may require a backend route.

- [ ] Inspect backend order model and admin route support before implementation:
  - [ ] `backend/src/routes/adminRouter.ts`
  - [ ] `backend/src/db/mariadb_access.ts`
  - [ ] `backend/src/db/mariadb_service.ts`
  - [ ] `shared/src/mariadb.ts`
- [ ] Add frontend order types to `AdminApiService.ts` or import shared types if admin can consume `@k_suite/shared` safely.
- [x] Add service methods:
  - [ ] `listOrders(): Promise<OrderRecord[]>`
  - [ ] `markOrderShipped(orderId: string): Promise<OrderRecord>` once backend supports it.
- [ ] If backend does not support shipped updates, add backend task:
  - [ ] Add shared status value if needed, using existing `OrderStatus` if `fulfilled` means shipped.
  - [ ] Add `PATCH /api/admin/orders/:orderId` or `PATCH /api/admin/orders/:orderId/status`.
  - [ ] Add access/service methods to update order status.
  - [ ] Add backend route tests.
  - [ ] Add docs route entry for the new endpoint.
- [x] Create `admin/src/components/orders/OrdersDashboard.tsx`.
- [ ] Create `admin/src/components/orders/PendingOrdersPanel.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/orders/OrderHistoryPanel.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/orders/OrderMetricsPanel.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Presenter responsibilities:
  - [ ] Load orders on entering Orders category.
  - [ ] Split pending orders from history.
  - [ ] Mark shipped/fulfilled through service.
  - [ ] Refresh local lists after mutation.
  - [ ] Calculate simple metrics: pending count, fulfilled count, total revenue/charged amount.
- [ ] UI behavior:
  - [ ] Pending orders appear first.
  - [ ] Each pending order has a clear “Mark shipped” action.
  - [ ] Order history shows non-pending orders.
  - [ ] Metrics summarize order counts and charged amount.
- [ ] Verification:
  - [ ] Presenter unit test or minimal service mock test for splitting pending/history.
  - [ ] Backend tests pass if backend endpoint is added.
  - [ ] `npm run build` and `npm run lint` in `admin/`.
  - [ ] `npm test` in `backend/` if backend changed.

### Phase 5: Product Listing and Image Upload Components

- [x] Create `admin/src/components/products/ProductDashboard.tsx`.
- [ ] Create `admin/src/components/products/ProductListingForm.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/products/ProductEditor.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/products/ProductImageUpload.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/products/PatternPdfUpload.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Keep upload behavior in presenter/service, not directly in form components.
- [ ] Product image flow:
  - [ ] User selects image in `ProductImageUpload`.
  - [ ] Presenter calls `uploadPhoto('product', file)`.
  - [ ] Service receives `{ bucket, key, publicUrl }`.
  - [ ] Presenter returns/sets `publicUrl` as the product listing `thumbnailImage` field.
  - [ ] Product form visibly previews the returned bucket URL image.
  - [ ] Product creation sends `thumbnailImage: publicUrl` so shop users see bucket-hosted images.
- [ ] Pattern PDF flow:
  - [ ] User uploads PDF.
  - [ ] Presenter calls `uploadPatternPdf(file)`.
  - [ ] Returned `key` is attached to the pattern product `pdfKey` field.
- [ ] Product editing flow:
  - [ ] Existing product ID can be entered or selected.
  - [ ] Edit form sends only changed fields through `updateProduct(productId, patch)`.
  - [ ] Delete product action requires a confirmation UI.
- [ ] Check if backend can list all products for admin editing.
  - [ ] If missing, add backend route such as `GET /api/admin/products` with admin auth.
  - [ ] Add service method `listAdminProducts()`.
- [ ] Verification:
  - [ ] Upload image returns a URL and populates product image field.
  - [ ] Product preview uses returned `publicUrl`.
  - [ ] Create plushie sends `readyToShip` and `colorVariations`.
  - [ ] Create pattern sends `pdfKey`.
  - [ ] Build/lint pass.

### Phase 6: Blog Article Editor Components

Backend routes and persistence for blog articles are not visible in the current admin route set. Treat this as a frontend scaffold plus backend contract decision unless routes already exist elsewhere.

- [ ] Define blog content block types in a shared/frontend type file:
  - [ ] heading block: `{ type: 'heading'; level: 1 | 2 | 3; text: string }`
  - [ ] paragraph block: `{ type: 'paragraph'; text: string }`
  - [ ] image block: `{ type: 'image'; url: string; alt: string }`
  - [ ] YouTube block: `{ type: 'youtube'; videoId: string; title?: string }`
- [x] Create `admin/src/components/blog/BlogDashboard.tsx`.
- [ ] Create `admin/src/components/blog/BlogArticleEditor.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/blog/BlogBlockStack.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create block editors:
  - [ ] `HeadingBlockEditor.tsx`
  - [ ] `ParagraphBlockEditor.tsx`
  - [ ] `ImageBlockEditor.tsx`
  - [ ] `YoutubeBlockEditor.tsx`
- [ ] Create image upload integration for blog images:
  - [ ] Reuse upload presenter/service path with `uploadPhoto('blog', file)`.
  - [ ] Attach returned `publicUrl` to the image block.
- [ ] Add block stack controls:
  - [ ] Add heading
  - [ ] Add paragraph
  - [ ] Add image
  - [ ] Add YouTube embed
  - [ ] Move block up/down
  - [ ] Delete block
- [ ] Add YouTube validation helper:
  - [ ] Accept raw video ID or URL.
  - [ ] Normalize to video ID in presenter/helper layer.
- [ ] Backend contract decision:
  - [ ] Decide blog article fields: title, slug, excerpt, blocks, published status, timestamps.
  - [ ] Add backend routes if absent: list/create/update/delete/publish blog articles.
  - [ ] Add backend docs entries and tests.
- [ ] Verification:
  - [ ] Editor can create a stack with all block types.
  - [ ] Blog image upload attaches returned bucket URL to image block.
  - [ ] YouTube URL normalizes to embed-ready video ID.
  - [ ] Build/lint pass.

### Phase 7: Server Metrics and Service Health Components

- [x] Create `admin/src/components/serverMetrics/ServerMetricsDashboard.tsx`.
- [ ] Create `admin/src/components/serverMetrics/ServiceHealthCard.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Create `admin/src/components/serverMetrics/ApiSurfacePanel.tsx`. *(implemented inside the category dashboard component; split into separate files if desired next)*
- [ ] Reuse current `/api/health` and `/api/docs` service methods for initial health display.
- [ ] Display at minimum:
  - [ ] Backend health status.
  - [ ] Last checked timestamp.
  - [ ] Count of exposed API endpoints from `/api/docs`.
  - [ ] Endpoint list grouped by category: Admin, Shop, User, Docs/Health.
- [ ] Check whether deeper service health exists for MariaDB and MinIO.
  - [ ] If absent, plan backend endpoint like `GET /api/admin/metrics` or `GET /api/admin/service-health` requiring admin auth.
  - [ ] Include backend checks for database and object storage connectivity.
- [ ] Future metrics candidates:
  - [ ] order counts by status
  - [ ] product counts by type/availability
  - [ ] blog article counts by published/draft
  - [ ] backend uptime or timestamp
- [ ] Verification:
  - [ ] Server Metrics category displays health without requiring manual refresh.
  - [ ] Refresh button updates timestamp/status.
  - [ ] Build/lint pass.

### Phase 8: Presenter and Service Refactor

- [ ] Split `AdminDashboardPresenter.ts` if it becomes too broad:
  - [ ] `AdminSessionPresenter.ts`
  - [ ] `OrdersPresenter.ts`
  - [ ] `ProductsPresenter.ts`
  - [ ] `BlogPresenter.ts`
  - [ ] `ServerMetricsPresenter.ts`
- [ ] Keep `AdminDashboardPresenter.ts` only as an orchestration presenter if needed.
- [ ] Split `AdminApiService.ts` into domain-specific service modules if it grows too large:
  - [ ] `AdminAuthService.ts`
  - [ ] `AdminOrdersService.ts`
  - [ ] `AdminProductsService.ts`
  - [ ] `AdminBlogService.ts`
  - [ ] `AdminMetricsService.ts`
- [ ] Keep a shared request helper for credentials, JSON parsing, and error handling.
- [ ] Add mock service classes or factory helpers for presenter tests.
- [ ] Verification:
  - [ ] No presenter imports React.
  - [ ] No component calls `fetch` directly.
  - [ ] Service modules are the only files with HTTP endpoint strings, except route labels rendered from `/api/docs`.

### Phase 9: Styling and UX Pass

- [ ] Replace generic current dashboard sections with category-focused layout.
- [ ] Ensure all form fields have labels.
- [ ] Ensure file upload components expose selected file names.
- [ ] Ensure destructive actions require confirmation.
- [ ] Add empty states for:
  - [ ] No pending orders
  - [ ] No order history
  - [ ] No created products loaded
  - [ ] No blog articles
  - [ ] Metrics unavailable
- [ ] Add success/error messages scoped to each category where useful.
- [ ] Keep global status banner for cross-dashboard operations.
- [ ] Verify responsive layout on narrow viewport.

### Phase 10: Testing and Verification

- [ ] Add frontend test setup only if the project wants frontend tests now; otherwise keep verification to build/lint.
- [ ] If adding tests, start with presenter tests because presenters avoid React/DOM.
- [ ] Suggested test coverage:
  - [ ] login success reveals dashboard state
  - [ ] login failure keeps dashboard hidden
  - [ ] product image upload result populates product thumbnail URL
  - [ ] pattern PDF upload result populates `pdfKey`
  - [ ] pending/history order split
  - [ ] mark shipped calls service with the order id
  - [ ] blog block stack add/move/delete behavior
  - [ ] YouTube URL normalization
- [ ] Always run before handoff:
  - [x] `cd admin && npm run build`
  - [x] `cd admin && npm run lint`
  - [x] `cd backend && npm test` if backend routes/services changed
- [ ] Optional runtime verification:
  - [ ] Start backend/frontend stack.
  - [ ] Visit admin app.
  - [ ] Confirm login gate.
  - [ ] Confirm dashboard categories render only after login.
  - [ ] Upload an image and confirm returned bucket URL appears in product form preview.
  - [ ] Create a product and confirm shop can display returned image URL.

## Likely Files to Change

Frontend:
- `admin/src/App.tsx`
- `admin/src/views/AdminDashboardView.tsx`
- `admin/src/views/AdminDashboardView.css`
- `admin/src/service/AdminApiService.ts`
- `admin/src/presenter/AdminDashboardPresenter.ts`
- `admin/src/components/**`
- Possible new presenter files under `admin/src/presenter/`
- Possible new service files under `admin/src/service/`

Backend if missing contracts are added:
- `backend/src/routes/adminRouter.ts`
- `backend/src/routes/docsRoutes.ts`
- `backend/src/db/mariadb_access.ts`
- `backend/src/db/mariadb_service.ts`
- `shared/src/mariadb.ts`
- Possible shared blog types under `shared/src/`
- Backend route/service tests under `backend/tests/`

## Open Questions / Decisions Needed

- [ ] Does `OrderStatus.fulfilled` mean “shipped”, or should a distinct `shipped` status be added?
- [ ] Should blog article support be backend-backed in this phase, or should the admin UI only scaffold the editor first?
- [ ] What fields are required for blog article metadata: title, slug, excerpt, tags, cover image, published status?
- [ ] Should products have multiple images or only a single `thumbnailImage` currently?
- [ ] Should admin product editing list all products from the backend, or is entering a product ID acceptable initially?
- [ ] Should server metrics expose MariaDB and MinIO health behind an admin-only endpoint?
- [ ] Should logout clear/expire `admin_cookie` on the backend with a dedicated endpoint?

## Acceptance Criteria

- [x] Admin dashboard is hidden until successful admin login.
- [x] Existing dashboard UI is broken into reusable components under `admin/src/components/`.
- [x] Dashboard categories are stacked in a left column: Orders, Product, Blog Articles, Server Metrics.
- [x] Orders area supports pending orders, shipped/fulfilled action, history, and metrics.
- [x] Product area supports create/edit listings and image/PDF uploads that attach returned bucket URLs/keys to listing fields.
- [x] Blog area supports article editing as an ordered stack of headings, paragraphs, images, and YouTube embeds.
- [x] Server Metrics area shows service health and API/backend status.
- [x] Views do not call `fetch` directly.
- [x] Presenters do not import React.
- [x] `cd admin && npm run build` passes.
- [x] `cd admin && npm run lint` passes.
- [x] `cd backend && npm test` passes if backend changes are included.
