# Kaylie's Creations client

## What it is

The client app is the customer-facing storefront for Kaylie's Creations. It is a React/Vite TypeScript frontend with MVP-style presenter and service boundaries. It renders shop categories, product cards, cart/checkout flows, profiles, purchased pattern downloads, public blog content, and market information.

In production the built Vite app is served by `client/server.js`, an Express process that also proxies relative `/api` and `/ws` requests to the backend over the Docker network. Product images and purchased pattern PDF download links returned by the backend point at `https://storage.kayliescreations.com`, so the browser downloads assets directly from storage rather than through the backend proxy.

## How to set up for development

Build the shared package first, then install and run the client:

```sh
cd ../shared && npm ci && npm run build
cd ../client && npm ci
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
PORT=7080
BACKEND_URL=http://backend:7500
```

The service publishes host port `7080` and joins the `kaylies_creations` Docker network. Keep frontend API calls relative (`/api/...`) so the Express proxy can route them to the backend service name. Do not proxy MinIO file bytes through this service; the backend returns storage URLs under `https://storage.kayliescreations.com` for images and presigned pattern PDF downloads.

Secrets needed directly by the client container: none. Runtime secrets are held by the backend. The client only needs the backend proxy target and any non-secret Vite build-time public values deliberately added in the future.
