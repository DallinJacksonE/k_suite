# Docker support

## What it is

This directory contains supporting files for Dockerized infrastructure. The current MinIO entrypoint creates the public asset and private pattern buckets and grants anonymous download permission only to the public asset bucket.

## How to set up for development

Run the storage dependency from the repo root:

```sh
docker compose up -d bucket
```

For local browser testing, set the backend's `MINIO_PUBLIC_ENDPOINT` to `http://127.0.0.1:7520`. For production-like URL generation, set it to `https://storage.kayliescreations.com`.

## How to deploy

The bucket container publishes MinIO's API on host port `7520`; reverse-proxy `storage.kayliescreations.com` to that port. Keep `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_PUBLIC_BUCKET`, and `MINIO_PRIVATE_BUCKET` aligned between the bucket service and backend service.

Secrets needed:

- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_BUCKET`
- `MINIO_PRIVATE_BUCKET`
