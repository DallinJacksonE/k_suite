# Kaylie's Creations backend

## What it is

The backend is the Express/TypeScript API for Kaylie's Creations. It owns public storefront APIs, admin APIs, customer sessions, CSRF-aware user flows, cart/checkout/order persistence, purchased-pattern download grants, blog and market records, Square payment capture, order email, MariaDB access, and MinIO-compatible object storage.

The backend separates internal object-store traffic from browser-facing file URLs:

- uploads and deletes use `MINIO_ENDPOINT`, which is `http://bucket:9000` inside Docker Compose
- public image URLs and private presigned PDF download URLs use `MINIO_PUBLIC_ENDPOINT`, which is `https://storage.kayliescreations.com` in production

That split lets the client render images and download PDFs directly from the storage domain without streaming file bytes through the backend.

## How to set up for development

Build the shared package first, then install and run the backend:

```sh
cd ../shared && npm ci && npm run build
cd ../backend && npm ci
npm run dev
```

Start local infrastructure when using the MariaDB and MinIO adapters:

```sh
cd ..
docker compose up -d mariadb bucket
```

Recommended local backend environment:

```sh
PORT=7500
MARIADB_HOST=127.0.0.1
MARIADB_PORT=7510
MARIADB_DATABASE=k_suite
MARIADB_USER=k_suite
MARIADB_PASSWORD=k_suite_password
MINIO_ENDPOINT=http://127.0.0.1:7520
MINIO_PUBLIC_ENDPOINT=http://127.0.0.1:7520
MINIO_PUBLIC_BUCKET=public-assets
MINIO_PRIVATE_BUCKET=private-patterns
MINIO_ACCESS_KEY=k_suite_minio
MINIO_SECRET_KEY=k_suite_minio_password
```

Use `MINIO_PUBLIC_ENDPOINT=https://storage.kayliescreations.com` when validating production link generation locally.

Useful checks:

```sh
npm test
npm run build
curl http://127.0.0.1:7500/api/health
```

## How to deploy

Compose runs the backend on `PORT=7500`, publishes host port `7500`, and attaches it to the `kaylies_creations` Docker network. The backend connects to infrastructure by service name:

```sh
MARIADB_HOST=mariadb
MARIADB_PORT=3306
MINIO_ENDPOINT=http://bucket:9000
MINIO_PUBLIC_ENDPOINT=https://storage.kayliescreations.com
```

Required production secrets/configuration:

- `MARIADB_DATABASE`
- `MARIADB_USER`
- `MARIADB_PASSWORD`
- `MARIADB_ROOT_PASSWORD` for the database container
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_BUCKET`
- `MINIO_PRIVATE_BUCKET`
- `MINIO_PUBLIC_ENDPOINT=https://storage.kayliescreations.com`
- admin bootstrap/login secrets used by the admin auth flow
- session/cookie/CSRF secrets for authenticated client and admin requests
- Square application id, location id, environment, and access token for payment capture
- SMTP host, port, username, password, sender address, and admin recipient addresses for order email

Deploy from the repo root:

```sh
docker compose build backend
docker compose up -d --wait backend
curl http://127.0.0.1:7500/api/health
```
