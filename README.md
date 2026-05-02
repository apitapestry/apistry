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

The Docker Compose setup builds the app image locally, starts Apistry on `127.0.0.1:3000`, mounts your local config file, passes through `API_KEY` and `MONGO_PASSWORD`, and stores SQLite data in a named Docker volume when SQLite is used.

Your local config file must exist at:

```sh
~/Data/docker/config.yml
```

It is mounted read-only inside the container at:

```sh
/app/config/config.yml
```

The container starts with:

```sh
node dist/apistry.js start --config /app/config/config.yml
```

Build and start:

```sh
docker compose up --build -d
```

View logs:

```sh
docker compose logs -f apistry
```

Stop the app:

```sh
docker compose down
```

Stop and remove the app container while preserving the `apistry-data` volume:

```sh
docker compose rm -sf apistry
```

Remove the app container and its named data volume:

```sh
docker compose down -v
```

To publish a different host port, set `APISTRY_HOST_PORT`:

```sh
APISTRY_HOST_PORT=8080 docker compose up --build -d
```

## Notes

Apistry accepts `.yml`, `.yaml`, and `.json` config files. The Docker setup uses `config.yml` because that is the filename provided for the local Docker Desktop config.

Your current Docker config uses `/home/ec2-user/site/contracts` and `/home/ec2-user/site/docs`; the image includes the contracts and built docs site at those paths. If the config contains relative paths such as `docs-site/static/contracts`, `docs-site/build`, or `data/sqlite.db`, they resolve relative to `/app` inside the container. `data/sqlite.db` resolves to the persistent `apistry-data` volume mounted at `/app/data`.

## License

MIT © Apistry contributors
