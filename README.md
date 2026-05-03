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

Build the local Docker image:

```sh
docker build -f image/Dockerfile -t apistry:local .
```

Run it on `127.0.0.1:3000`:

```sh
docker run --name apistry --rm -p 127.0.0.1:3000:3000 apistry:local
```

The image includes the default runtime site under `/home/node/site`:

```sh
/home/node/site/config.yml
/home/node/site/contracts
/home/node/site/sqlite.db
```

The container starts with:

```sh
node dist/apistry.js start --config "$APISTRY_CONFIG_PATH"
```

`APISTRY_CONFIG_PATH` defaults to:

```sh
/home/node/site/config.yml
```

To override the default site filesystem, mount a host directory with the same layout:

```sh
docker run --name apistry --rm \
  -p 127.0.0.1:3000:3000 \
  -v /absolute/path/to/site:/home/node/site:ro \
  apistry:local
```

## Notes

Apistry accepts `.yml`, `.yaml`, and `.json` config files. The Docker image defaults to `/home/node/site/config.yml`.

## License

MIT © Apistry contributors
