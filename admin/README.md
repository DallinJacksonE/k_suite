# Kaylie's Creations admin

## What it is

The admin app is the internal management console for Kaylie's Creations. It is a React/Vite TypeScript frontend organized around service, presenter, and view boundaries. Admin workflows include product management, image/PDF uploads, blog collections/articles, markets, user accounts, orders, fulfillment, refunds/markers, and backend API/health inspection.

In production the built Vite app is served by `admin/server.js`, an Express process that proxies relative `/api` and `/ws` requests to the backend over the Docker network. Upload workflows send files to the backend; the backend stores them in MinIO and returns browser-facing links under `https://storage.kayliescreations.com`.

## How to set up for development

Build the shared package first, then install and run the admin app:

```sh
cd ../shared && npm ci && npm run build
cd ../admin && npm ci
npm run dev
```

The Vite dev server proxies `/api` and `/ws` to `http://localhost:7500` by default. Override with either:

```sh
VITE_BACKEND_URL=http://localhost:7500 npm run dev
# or
BACKEND_URL=http://localhost:7500 npm run dev
```

Useful checks:

```sh
npm test
npm run build
npm run lint
```

## How to deploy

The Docker image builds the Vite app, copies `dist/`, and runs:

```sh
npm start
```

Compose sets:

```sh
PORT=7081
BACKEND_URL=http://backend:7500
```

The service publishes host port `7081` and joins the `kaylies_creations` Docker network. Keep admin API calls relative (`/api/...`) so the Express proxy can route them to the backend service name.

Secrets needed directly by the admin container: none. Admin credentials, cookie/session secrets, storage credentials, payment secrets, and SMTP credentials are backend deployment secrets.
