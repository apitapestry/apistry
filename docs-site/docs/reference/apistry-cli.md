# Apistry CLI Reference

This page documents the command-line entry points that are wired by the current runtime.

---

## `apistry`

`apistry` starts the API runtime from OpenAPI contracts.

### Global Options

- `-h, --help`
- `-v, --version`

### `apistry start`

Starts the Apistry server.

```bash
apistry start --contract ./contracts --dbDir ./data/sqlite --port 3000 --logLevel info
```

Options:

| Option | Description | Default |
|---|---|---|
| `-c, --contract <string>` | Path to a contract file or directory. Overrides `contracts.path` from config. | config/default |
| `-d, --dbDir <string>` | SQLite database directory, or `IN-MEMORY-DB`. Overrides `database.connection` with a SQLite connection. | `IN-MEMORY-DB` |
| `-p, --port <string>` | Service port. Overrides `server.port`. | `3000` |
| `-l, --logLevel <string>` | Log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent`. | `info` |
| `--config <string>` | Optional YAML or JSON config file. Values are merged over the built-in defaults. | none |

Runtime behavior:

- Loads the built-in `config.default.yml`.
- Merges `--config` when provided.
- Applies CLI overrides for contract path, SQLite database directory, port, and log level.
- Starts Fastify on the resolved host and port.
- Serves Swagger UI at `/swagger-ui` when `server.swaggerUiEnabled` is true.

Environment overrides:

- `APISTRY_HOST` or `HOST` override `server.host`.
- `APISTRY_PORT` or `PORT` override `server.port` unless `--port` is passed.
- Config file strings support `$VAR` and `${VAR}` substitution.

---

## `apistry-etl`

The source tree also includes a separate ETL/import/export CLI module at `src/apistry-etl.js`.

Current packaging note: `package.json` only registers `apistry` in `bin`. Unless packaging is updated to expose `apistry-etl`, run the module directly from source or built output.

### `apistry-etl import`

Imports JSON or CSV files into collections.

```bash
node src/apistry-etl.js import --inputPath ./data/imports --dbConnection sqlite://./data/sqlite.db --replace true
```

Options:

- `-i, --inputPath <string>`: directory or file containing JSON/CSV data
- `-d, --dbConnection <string>`: database connection string
- `-r, --replace <string>`: clear collections before loading when truthy
- `-m, --maxDocs <integer>`: maximum documents to load per file

### `apistry-etl export`

Exports one collection or all collections to JSON or CSV.

```bash
node src/apistry-etl.js export --outputPath ./exports --dbConnection sqlite://./data/sqlite.db --format json
```

Options:

- `-o, --outputPath <string>`: output directory or file
- `-d, --dbConnection <string>`: database connection string
- `-c, --collection <string>`: collection to export
- `-f, --format <string>`: `json` or `csv`

### `apistry-etl etl`

Runs contract-driven extract, normalize, and load stages.

```bash
node src/apistry-etl.js etl --config ./data/swapi/etl-config-v1.yml
```

Options:

- `-c, --config <string>`: ETL config YAML file
- `-s, --stage <string>`: run only `extract`, `normalize`, or `load`
- `--dry-run`: validate and show planned work without executing

---

## Error Behavior

- Configuration errors are fatal during startup.
- Fastify request validation failures return `400`, except invalid additional query parameters are normalized to `422`.
- Contract-declared `x-validations` failures return `422`.
- Outbound HTTP dependency failures from `httpCheck` return `500`.
