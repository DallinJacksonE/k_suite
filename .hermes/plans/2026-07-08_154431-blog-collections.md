# Blog Collections Implementation Plan

> **For Hermes:** Implement this plan task-by-task after user approval. Do not commit unless explicitly asked.

**Goal:** Add admin-managed blog collections, allow articles to belong to one or more collections, and render the client blog page as collection cards that open into date-sorted article grids using each article's first image block as the thumbnail.

**Architecture:** Treat blog collections as first-class admin-managed records and treat article membership as a many-to-many relationship. Store collection definitions in a `blog_collections` table and article membership in a `blog_article_collections` join table, while still exposing a normalized `collectionTags: string[]` field to admin/client APIs. Preserve Kaylies Creations Updates as the default/fallback collection so untagged legacy articles still appear somewhere. Add slug-based client routes so article cards open `/blog/:slug` with a back arrow to the originating collection grid.

**Tech Stack:** TypeScript, React 19, Express, MariaDB, Node test runner, Vite.

---

## Current context

- Client blog route is `client/src/view/BlogView.tsx` and currently renders a two-column article list + reader immediately.
- Blog components live under `client/src/components/blog/`:
  - `BlogArticleList.tsx` renders the current sidebar list.
  - `BlogArticleReader.tsx` renders block-based articles and already supports image blocks.
- Blog styling is in `client/src/view/BlogView.css`.
- Client blog types are duplicated in `client/src/service/ClientTypes.ts`.
- Admin blog CRUD UI is in `admin/src/components/blog/BlogDashboard.tsx`.
- Admin API types live in `admin/src/service/AdminApiService.ts`.
- Shared backend contracts live in `shared/src/mariadb.ts`.
- Backend blog storage and mapping live in `backend/src/db/mariadb_service.ts`.
- Backend access validation lives in `backend/src/db/mariadb_access.ts`.
- Admin blog routes are already pass-through CRUD in `backend/src/routes/adminRouter.ts`.
- Public blog route is `backend/src/routes/blogRoutes.ts`, returning `listPublishedBlogArticles()`.
- Existing tests to update/add include:
  - `client/tests/blog-presenter.test.ts`
  - `admin/tests/admin_presenter.test.ts`
  - `backend/tests/blog_routes.test.mjs`
  - `backend/tests/admin_management_routes.test.mjs`
  - `backend/tests/mariadb_access.test.mjs`
  - `shared/tests/phase1-shared-contract.test.ts`

## Decisions / assumptions

- Add `collectionTags: string[]` at API/type/UI boundaries and use normalized slug-like tag strings in storage.
- Add admin-managed blog collection records with at least these initial/default collections:
  - `kaylies-creations-updates` with label `Kaylies Creations Updates`
  - `tutorials` with label `Tutorials`
- Store collection tags as strings, not a database enum, so admins can add/remove collections without schema migrations.
- Articles may belong to multiple collections. Admin article editing should support changing the selected collection tags later.
- Existing/untagged articles should remain visible by being treated as part of `kaylies-creations-updates` at read/normalization time.
- Article date sorting should use `createdAt` descending, falling back to empty/invalid dates last and then title for stability.
- Thumbnail selection should use the first `block.type === 'image'` block with a non-empty `url`. If none exists, render a styled placeholder instead of breaking the grid.
- Client article cards should link to slug routes (`/blog/:slug`). The article page should include a back arrow that returns to the collection grid the user came from when possible.

## Resolved requirements

1. Use the exact collection label from the request: `Kaylies Creations Updates`.
2. Admins can add/remove collections.
3. Articles can belong to multiple collections and their collection tags can be changed later.
4. `Kaylies Creations Updates` must always exist as the fallback collection for untagged articles.
5. Article cards should open slug routes, with an article-page back arrow returning to the collection grid.

---

## Task 1: Add shared blog collection contracts

**Objective:** Make collection records and article collection memberships part of the cross-boundary model.

**Files:**
- Modify: `shared/src/mariadb.ts:243-274`
- Modify: `shared/tests/phase1-shared-contract.test.ts`

**Steps:**
1. Add exported constants/types near the blog block types:
   - `DEFAULT_BLOG_COLLECTION_TAG = 'kaylies-creations-updates'`
   - `BlogCollectionRecord { tag: string; label: string; description?: string; createdAt?: Date | string; updatedAt?: Date | string }`
   - `CreateBlogCollectionInput { tag?: string; label: string; description?: string }`
   - `UpdateBlogCollectionInput { tag?: string; label?: string; description?: string }`
2. Add `collectionTags: string[]` to `BlogArticleRecord`.
3. Add `collectionTags?: string[]` to `CreateBlogArticleInput` and `UpdateBlogArticleInput` so legacy/admin draft calls can default safely.
4. Extend `MariaDbServiceLike` and `MariaDbAccess` with collection CRUD methods for admin routes.
5. Update shared contract tests to assert that blog collection records and article membership arrays compile.

**Validation:**
- Run: `npm test` in `shared/`
- Expected: shared type contract test passes.

---

## Task 2: Persist admin-managed collections and article memberships

**Objective:** Store collection definitions, article-to-collection memberships, and return `collectionTags` for every article.

**Files:**
- Modify: `backend/src/db/mariadb_service.ts:200-213`
- Modify: `backend/src/db/mariadb_service.ts:490-507`
- Modify: `backend/src/db/mariadb_service.ts:586`

**Steps:**
1. Create `blog_collections` with `tag VARCHAR(128) PRIMARY KEY`, `label VARCHAR(255) NOT NULL`, optional `description TEXT NULL`, and timestamps.
2. Create `blog_article_collections` with `article_id CHAR(36) NOT NULL`, `collection_tag VARCHAR(128) NOT NULL`, a composite primary key, and foreign keys to `blog_articles` and `blog_collections` where compatible with existing migration style.
3. Seed/upsert default collections during `initialize()`:
   - `kaylies-creations-updates` / `Kaylies Creations Updates`
   - `tutorials` / `Tutorials`
4. Add service methods to list/create/update/delete blog collections. Protect deletion of `kaylies-creations-updates` at the access layer, and have service deletion remove join rows for non-default collections.
5. Update `insertBlogArticle()` to insert article data first, then join rows for normalized `input.collectionTags` with fallback to `['kaylies-creations-updates']`.
6. Update `updateBlogArticle()` to replace join rows only when `patch.collectionTags !== undefined`.
7. Update `listBlogArticles()` and `findBlogArticleById()` to hydrate `collectionTags` for returned articles. Keep untagged articles returning `['kaylies-creations-updates']`.

**Validation:**
- Run: `npm run build` in `backend/`
- Expected: TypeScript build succeeds.

---

## Task 3: Add backend access and admin routes for collection CRUD

**Objective:** Ensure admin CRUD can manage collection records, article writes validate collection memberships, and published articles expose memberships.

**Files:**
- Modify: `backend/src/db/mariadb_access.ts:238-242`
- Modify: blog validation helper lower in `backend/src/db/mariadb_access.ts` after locating `validateBlogArticle` / `validateBlogBlocks`
- Modify: `backend/src/routes/adminRouter.ts`
- Modify: `backend/tests/mariadb_access.test.mjs`
- Modify: `backend/tests/admin_management_routes.test.mjs`
- Modify: `backend/tests/blog_routes.test.mjs`

**Steps:**
1. Locate the existing `validateBlogArticle` and related helpers.
2. Add collection helpers:
   - `normalizeBlogCollectionTag(value: string): string`
   - `normalizeBlogCollectionTags(values?: string[]): string[]` that trims, slugifies/lowercases if needed, de-duplicates, removes blanks, and defaults to `['kaylies-creations-updates']`.
3. In `createBlogArticle()`, pass normalized `collectionTags` into `service.insertBlogArticle()`.
4. In `updateBlogArticle()`, when `input.collectionTags !== undefined`, normalize before calling `service.updateBlogArticle()`.
5. Add access methods: `listBlogCollections`, `createBlogCollection`, `updateBlogCollection`, `deleteBlogCollection`.
6. Ensure `deleteBlogCollection` rejects `kaylies-creations-updates` so the fallback collection cannot be removed.
7. Add admin routes:
   - `GET /admin/blog/collections`
   - `POST /admin/blog/collections`
   - `PATCH /admin/blog/collections/:tag`
   - `DELETE /admin/blog/collections/:tag`
8. Keep `listPublishedBlogArticles()` filtering by `published`; tests should confirm `collectionTags` are preserved and untagged articles default to updates.
9. Update fake services/tests to include `collectionTags` in sample blog articles and CRUD request bodies.

**Validation:**
- Run: `npm test` in `backend/`
- Expected: backend builds and all backend Node tests pass.

---

## Task 4: Add admin collection management and article multi-select membership

**Objective:** Let admins add/remove collections and assign articles to one or more collections.

**Files:**
- Modify: `admin/src/service/AdminApiService.ts:24-28`
- Modify: `admin/src/components/blog/BlogDashboard.tsx:80-140`
- Modify: `admin/src/presenter/AdminDashboardPresenter.ts`
- Modify: `admin/src/views/AdminDashboardView.tsx`
- Modify: `admin/tests/admin_presenter.test.ts`

**Steps:**
1. Add collection types and CRUD service methods in `AdminApiService.ts`.
2. Add `collectionTags?: string[]` to `BlogArticleInput` and `collectionTags: string[]` to `BlogArticleRecord`.
3. Load collections alongside blog articles in the admin dashboard presenter/view state.
4. Add a collection management panel in `BlogDashboard` for creating, renaming/updating, and deleting collections.
5. Disable/hide deletion for `kaylies-creations-updates` and explain it is the required fallback collection.
6. Update `emptyDraft()` to default `collectionTags: ['kaylies-creations-updates']`.
7. Update `BlogInlineEditor` initial state to include article collection tags with fallback to updates.
8. Replace the single collection field with checkbox-style multi-select membership using the loaded collection list.
9. Ensure the form enforces at least one selected collection before submit, defaulting to updates if all boxes are cleared.
10. Update article summaries to show collection labels next to published/draft state.
11. Update admin presenter/service tests to expect collections are loaded and `collectionTags` are preserved through create/update.

**Validation:**
- Run: `npm test` in `admin/`
- Run: `npm run build` in `admin/`
- Expected: admin tests and build pass.

---

## Task 5: Refactor client blog state and routing for collection landing, grids, and slug articles

**Objective:** Make `/blog` show collection cards, `/blog/collections/:collectionTag` show that collection's article grid, and `/blog/:slug` show the article reader with a back arrow to the originating collection grid.

**Files:**
- Modify: `client/src/service/ClientTypes.ts:125-142`
- Modify: `client/src/presenters/BlogPresenter.ts:7-45`
- Modify: `client/src/App.tsx`
- Modify: `client/src/view/BlogView.tsx:1-32`
- Create or modify: `client/src/components/blog/BlogCollectionList.tsx`
- Create or modify: `client/src/components/blog/BlogArticleGrid.tsx`
- Optionally keep/adjust: `client/src/components/blog/BlogArticleList.tsx`
- Modify: `client/src/view/BlogView.css`
- Modify: `client/tests/blog-presenter.test.ts`

**Steps:**
1. Add `BlogCollection` and `collectionTags: string[]` to the client blog types.
2. Extend `BlogViewModel` with:
   - `selectedCollectionTag?: string`
   - existing `selectedSlug?: string`
3. Change presenter behavior:
   - `load()` loads articles sorted by date descending but does not auto-select the first article.
   - Add `selectCollection(collectionTag: string)` that sets collection and clears `selectedSlug`.
   - Add `selectArticle(slug: string)` for route-driven reader state.
   - Add `showCollections()` or `clearSelection()` to return to the main collection page.
4. Add routes in `client/src/App.tsx`:
   - `/blog` -> collection landing
   - `/blog/collections/:collectionTag` -> article grid for collection
   - `/blog/:slug` -> article reader
5. Use React Router location state or query params to remember the source collection when navigating from a grid to an article, e.g. link to `/blog/${article.slug}` with state `{ collectionTag }` or `?collection=<tag>`.
6. Add a helper to group articles by all `collectionTags`, retaining the default collection card even if empty.
7. Add `BlogCollectionList` component rendering collection cards with title, article count, latest date, and optional first thumbnail from newest article.
8. Add `BlogArticleGrid` component rendering selected collection articles as cards sorted by date descending. Card thumbnail comes from first image block; fallback placeholder if no image block.
9. Update `BlogView.tsx` conditional rendering:
   - No collection selected: show collection cards.
   - Collection selected and no article selected: show collection header, back button to `/blog`, article grid.
   - Article selected: show reader plus back arrow to `/blog/collections/:collectionTag` when source/default collection is known, otherwise `/blog`.
10. Preserve loading/error/empty states.

**Validation:**
- Run: `npm test` in `client/`
- Run: `npm run build` in `client/`
- Expected: client tests and build pass.

---

## Task 6: Update API docs if maintained by the app

**Objective:** Keep generated/static API docs accurate for admin and public blog article responses.

**Files:**
- Modify: `backend/src/routes/docsRoutes.ts:249-318`

**Steps:**
1. Update blog article request/response body descriptions to mention `collectionTags`.
2. Add admin collection CRUD endpoint docs.
3. Verify no tests assert old docs shape; if they do, update expected text.

**Validation:**
- Included in `backend npm test` from Task 3.

---

## Task 7: Full verification pass

**Objective:** Prove the end-to-end feature compiles and the targeted behavior is covered.

**Commands:**
1. `cd shared && npm test && npm run build`
2. `cd backend && npm test`
3. `cd admin && npm test && npm run build`
4. `cd client && npm test && npm run build`

**Manual smoke checks if dev servers are running/available:**
1. In admin blog UI, create a new collection and confirm it appears in the collection management list.
2. Create a draft article assigned to both `Tutorials` and the new collection with an image block.
3. Publish it.
4. Open `/blog` in the client.
5. Confirm main page shows `Kaylies Creations Updates`, `Tutorials`, and the new collection cards.
6. Click `Tutorials`; confirm a grid appears sorted newest-first.
7. Confirm the article card thumbnail uses the first image block.
8. Click the article; confirm the browser opens `/blog/<slug>` and the article reader renders all blocks.
9. Click the back arrow; confirm it returns to the Tutorials collection grid.
10. Remove the new collection in admin and confirm the required `Kaylies Creations Updates` collection cannot be removed.

---

## Risks and tradeoffs

- There is existing repo churn in many files. Before editing, re-run `git status --short` and avoid overwriting unrelated user changes.
- `dist/` files are modified in the working tree. Source edits plus `npm run build` may update `backend/dist`; decide during implementation whether built outputs should be included based on existing repo convention.
- Type definitions are duplicated across shared/backend/admin/client. The safest implementation updates all boundaries deliberately; a future cleanup could centralize blog types from `@k_suite/shared` in the frontends.
- Many-to-many collection membership is a larger backend change than a single article field. Keep the service methods small and tested so collection CRUD, article membership updates, and public article reads do not get coupled into one large function.
- If MariaDB `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` is unsupported in the deployed version, existing code already uses that syntax, so this plan follows the project pattern.

## Stop point

Implementation completed after user approval.

## Implementation notes

- Added shared blog collection contracts and article `collectionTags` membership arrays.
- Added backend `blog_collections` and `blog_article_collections` persistence with seeded default collections.
- Added admin collection CRUD endpoints, public collection listing, and docs entries.
- Added admin UI collection management and article multi-select collection assignment.
- Added client collection landing cards, collection article grids, and slug article routes with a back arrow to the originating collection grid.

## Validation results

- `cd shared && npm test` — passed.
- `cd shared && npm run build` — passed.
- `cd backend && npm test` — passed, 37 tests.
- `cd admin && npm test` — passed, 5 tests.
- `cd admin && npm run build` — passed.
- `cd client && npm test` — passed, 20 tests.
- `cd client && npm run build` — passed.
