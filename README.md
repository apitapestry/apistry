# apistry

APIstry - build and start APIs directly from an OpenAPI specification.

## Quick start

Install globally:

```sh
npm install -g apistry
```

Or run locally from the project:

```sh
cd apistry
npm install
npm run build
node dist/apistry.js start --config ./config.yml
```

See `src/apistry.js` for available CLI options.

## Docker Desktop

The Docker Compose setup builds the app image locally, starts Apistry on `127.0.0.1:3000`, mounts a site directory at `/home/node/site`, passes through `API_KEY` and `MONGO_PASSWORD`, and stores local SQLite data in a named Docker volume.

By default, Compose mounts the repo's `image/` directory. That gives the container this config file:

```sh
/home/node/site/config.yml
```

The image also includes that same default config, so a plain `docker run` can start without a bind mount.

The container starts with:

```sh
node dist/apistry.js start --config "$APISTRY_CONFIG_PATH"
```

`APISTRY_CONFIG_PATH` defaults to:

```sh
/home/node/site/config.yml
```

The container does not support additional Apistry CLI arguments. Put runtime settings in `config.yml`.

Build and start:

```sh
docker compose -f image/docker-compose.yml up --build -d
```

View logs:

```sh
docker compose -f image/docker-compose.yml logs -f apistry
```

Stop the app:

```sh
docker compose -f image/docker-compose.yml down
```

Stop and remove the app container while preserving the `apistry-data` volume:

```sh
docker compose -f image/docker-compose.yml rm -sf apistry
```

Remove the app container and its named data volume:

```sh
docker compose -f image/docker-compose.yml down -v
```

To publish a different host port, set `APISTRY_HOST_PORT`:

```sh
APISTRY_HOST_PORT=8080 docker compose -f image/docker-compose.yml up --build -d
```

To mount a different site directory, set `APISTRY_SITE_DIR` to an absolute or Compose-relative path. The directory should contain the config and any mounted assets referenced by that config:

```sh
APISTRY_SITE_DIR="$HOME/Data/docker" docker compose -f image/docker-compose.yml up --build -d
```

To use a different config file inside the mounted site directory, set `APISTRY_CONFIG_PATH`:

```sh
APISTRY_SITE_DIR="$HOME/Data/docker" \
APISTRY_CONFIG_PATH=/home/node/site/local.yml \
docker compose -f image/docker-compose.yml up --build -d
```

## Notes

Apistry accepts `.yml`, `.yaml`, and `.json` config files. The Docker image defaults to `/home/node/site/config.yml`.

The bundled Docker config references `/app/contracts`, which contains a sample contract copied into the image. A custom mounted config can instead reference paths inside the mounted site directory, such as `/home/node/site/contracts` or `/home/node/site/docs`. For local SQLite, use a path under `/app/data` so it persists in the `apistry-data` volume.

If the config contains relative paths such as `docs-site/static/contracts`, `docs-site/build`, or `data/sqlite.db`, they resolve relative to `/app` inside the container. `data/sqlite.db` resolves to the persistent `apistry-data` volume mounted at `/app/data`.

## License

MIT © Apistry contributors
