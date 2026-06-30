# k_suite Docker setup

This project runs five Docker Compose services:

- `backend` - Express API service on host port `5000`
- `client` - client frontend served by `client/server.js` on host port `5001`
- `admin` - admin frontend served by `admin/server.js` on host port `5002`
- `mariadb` - MariaDB database, available only on the Compose network
- `bucket` - local MinIO-compatible bucket service on host ports `9000` and `9001`

The client and admin services proxy `/api` and `/ws` traffic to the backend through the `BACKEND_URL` environment variable set in `docker-compose.yml`.

## Local config

For now, local MariaDB and MinIO values are hardcoded directly in `docker-compose.yml` under each service's `environment` block.

Current local values:

- MariaDB database: `k_suite`
- MariaDB user: `k_suite`
- MariaDB password: `k_suite_password`
- MariaDB root password: `root_password`
- MinIO bucket name passed to the backend: `k-suite`
- MinIO access key: `k_suite_minio`
- MinIO secret key: `k_suite_minio_password`

These are local placeholders and should be replaced before any shared or production deployment.

## Running

Start and wait for all services to become healthy:

```sh
docker compose up -d --wait
```

Give the bucket permission to write to its volume:

```sh
sudo chmod -R 777 ./minio_data
```

Run other Compose commands directly:

```sh
docker compose config
docker compose ps
docker compose logs -f backend
docker compose down
```

## Verification

After startup, check the services:

```sh
curl http://127.0.0.1:5000/api/health
curl http://127.0.0.1:5001/api/health
curl http://127.0.0.1:5002/api/health
docker compose ps
```

## Ports

- Backend API: <http://127.0.0.1:5000>
- Client frontend: <http://127.0.0.1:5001>
- Admin frontend: <http://127.0.0.1:5002>
- MinIO API: <http://127.0.0.1:9000>
- MinIO console: <http://127.0.0.1:9001>

## Cleanup

Stop containers while keeping volumes:

```sh
docker compose down
```

Stop containers and remove database/bucket volumes:

```sh
docker compose down -v
```
