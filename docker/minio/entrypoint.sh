#!/bin/sh
set -eu

: "${MINIO_BUCKET:=k-suite}"
: "${MINIO_ROOT_USER:=minioadmin}"
: "${MINIO_ROOT_PASSWORD:=minioadmin}"

/usr/bin/minio server /data --console-address ':9001' &
minio_pid="$!"

cleanup() {
  kill "$minio_pid" 2>/dev/null || true
  wait "$minio_pid" 2>/dev/null || true
}
trap cleanup INT TERM

until /usr/bin/mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; do
  sleep 1
done

/usr/bin/mc mb --ignore-existing "local/${MINIO_BUCKET}"

wait "$minio_pid"
