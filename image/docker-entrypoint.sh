#!/bin/sh
set -eu

CONFIG_PATH="${CONFIG_PATH:-/app/config/config.yml}"
APISTRY_DB_DIR="${APISTRY_DB_DIR:-}"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "Apistry config file not found at $CONFIG_PATH" >&2
  echo "Mount your local config.yml to that path or set CONFIG_PATH to the mounted file." >&2
  exit 1
fi

set -- node dist/apistry.js start --config "$CONFIG_PATH"

if [ -n "$APISTRY_DB_DIR" ]; then
  set -- "$@" --dbDir "$APISTRY_DB_DIR"
fi

exec "$@"
