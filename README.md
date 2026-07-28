# Kaylie's Creations k_suite

## What it is

k_suite is the Kaylie's Creations commerce and content platform. It is a Dockerized TypeScript monorepo with:

- a customer storefront (`client`) for shopping, carts, checkout, profiles, blog content, markets, and purchased pattern downloads
- an admin console (`admin`) for product, blog, market, order, fulfillment, and customer management
- an Express backend (`backend`) that owns API contracts, sessions, CSRF checks, MariaDB persistence, Square checkout integration, email delivery, and MinIO/S3-compatible object storage access
- a shared package (`shared`) for DTOs, contracts, and shared React toast UI used across apps
- infrastructure services for MariaDB and MinIO-compatible object storage

The browser-facing URLs for files stored in MinIO are generated with `MINIO_PUBLIC_ENDPOINT`. In production that endpoint is `https://storage.kayliescreations.com`, so public image URLs and private presigned PDF downloads can be opened directly by the client without proxying file bytes through the backend.

## Tech stack

- Runtime: Node.js 22, TypeScript, ECMAScript modules
- Frontends: React 19, Vite 8, React Router, MVP-style presenters/services/views
- Frontend serving/proxy: Express 5 plus `http-proxy-middleware`
- Backend: Express 5, MariaDB driver, MinIO JavaScript SDK, Multer, Nodemailer
- Shared contracts: local `@k_suite/shared` package consumed by backend, client, and admin
- Database: MariaDB 11.4
- Object storage: MinIO-compatible S3 storage with public asset and private pattern buckets
- Deployment/runtime: Docker Compose, service-name networking on the `kaylies_creations` bridge network
- Payments/email: Square checkout/payment environment variables and SMTP credentials

## How to set up for development

Install dependencies per package from the repo root:

```sh
cd shared && npm ci && npm run build
cd ../backend && npm ci
cd ../client && npm ci
cd ../admin && npm ci
```

Start the production-shaped dependency stack when you want MariaDB and MinIO locally:

```sh
docker compose up -d mariadb bucket
```

Run apps for local development in separate terminals:

```sh
cd backend && npm run dev
cd client && npm run dev
cd admin && npm run dev
```

Development defaults:

- backend dev server defaults to `PORT=3000` unless you set `PORT=7500`
- client/admin Vite dev proxies default to `http://localhost:7500`; override with `VITE_BACKEND_URL` or `BACKEND_URL`
- backend-to-MariaDB traffic uses `MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_DATABASE`, `MARIADB_USER`, and `MARIADB_PASSWORD`
- backend-to-MinIO uploads use `MINIO_ENDPOINT`; returned browser links use `MINIO_PUBLIC_ENDPOINT`

Useful verification commands:

```sh
cd shared && npm test && npm run build
cd backend && npm test
cd client && npm test && npm run build
cd admin && npm test && npm run build
```

## How to deploy

The Compose deployment runs all services on the shared Docker network and publishes these host ports:

- client frontend/proxy: `7080:7080`
- admin frontend/proxy: `7081:7081`
- backend API: `7500:7500`
- MariaDB: `7510:3306`
- MinIO bucket API: `7520:9000`

Internal service traffic stays on Docker DNS names:

- client/admin proxy `/api` and `/ws` to `http://backend:7500`
- backend connects to MariaDB at `mariadb:3306`
- backend uploads to MinIO at `http://bucket:9000`
- backend generates image and PDF links against `https://storage.kayliescreations.com`

Point `storage.kayliescreations.com` at the host and reverse-proxy it to host port `7520`. The public MinIO bucket is configured for anonymous download by `docker/minio/entrypoint.sh`; private pattern PDFs remain private and are accessed through backend-generated presigned URLs.

Create a production `.env` next to `docker-compose.yml` or export these before deployment:

```sh
MARIADB_DATABASE=k_suite
MARIADB_USER=replace-with-production-db-user
MARIADB_PASSWORD=replace-with-production-db-password
MARIADB_ROOT_PASSWORD=replace-with-production-root-password
MINIO_ACCESS_KEY=replace-with-production-minio-access-key
MINIO_SECRET_KEY=replace-with-production-minio-secret-key
MINIO_PUBLIC_BUCKET=public-assets
MINIO_PRIVATE_BUCKET=private-patterns
MINIO_PUBLIC_ENDPOINT=https://storage.kayliescreations.com
```

Backend production secrets also need to be provided through the deployment environment for the features you enable:

- admin bootstrap/login secrets used by the backend admin auth flow
- session/cookie/CSRF secrets used for authenticated client and admin requests
- Square application/location/access-token values for checkout
- SMTP host, port, username, password, sender, and admin notification recipients for order email

Deploy and verify:

```sh
docker compose config
docker compose build
docker compose up -d --wait
curl http://127.0.0.1:7500/api/health
curl http://127.0.0.1:7080/api/health
curl http://127.0.0.1:7081/api/health
docker compose ps
```

## Cleanup

Stop containers while keeping volumes:

```sh
docker compose down
```

Stop containers and remove database/bucket volumes:

```sh
docker compose down -v
```
