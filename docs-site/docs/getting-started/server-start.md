# Starting the Apistry Server

This page explains how to start Apistry with the current CLI and configuration model.

---

## Startup Command

The runtime server is started with:

```bash
apistry start
```

`start` always loads the built-in default config first, then optionally merges a YAML or JSON config file, then applies CLI overrides.

There is no separate `serve` command in the current CLI.

---

## Quick Local Start

Start against the default `./contracts` directory with an in-memory SQLite database:

```bash
apistry start
```

Start against a specific contract directory:

```bash
apistry start --contract ./contracts
```

Use a filesystem-backed SQLite database directory:

```bash
apistry start --contract ./contracts --dbDir ./data/sqlite
```

Use a config file:

```bash
apistry start --config ./config.yml
```

---

## What Happens at Startup

Apistry:

1. Loads and validates runtime configuration.
2. Opens the configured database connection.
3. Loads and merges OpenAPI contracts.
4. Registers built-in orchestration actions.
5. Optionally loads user-provided actions from `orchestrationActionsPath`.
6. Registers validation, security, CORS, static-site, controller, and Swagger plugins.
7. Starts Fastify on the configured host and port.

Swagger UI is available at `/swagger-ui` when `server.swaggerUiEnabled` is true.

---

## Configuration Sources

Configuration precedence:

1. Built-in `config.default.yml`
2. `--config` file, merged over defaults
3. Environment overrides for host and port
4. Explicit CLI options

Supported host and port environment variables:

- `HOST`
- `PORT`

Config file strings support `$VAR` and `${VAR}` environment substitution.

---

## Common Options

```bash
apistry start \
  --config ./config.yml \
  --contract ./docs-site/static/contracts \
  --dbDir ./data/sqlite \
  --port 3000 \
  --logLevel info
```

| Option | Purpose |
|---|---|
| `--config` | Load YAML or JSON runtime config. |
| `--contract` | Override `contracts.path`. |
| `--dbDir` | Use SQLite at this directory, or `IN-MEMORY-DB`. |
| `--port` | Override the resolved server port. |
| `--logLevel` | Override the resolved log level. |

---

## Database Backends

The current database dispatcher supports:

- `sqlite://...`
- `mongo://...`
- `mongodb+srv://...`
- `postgres://...`
- `postgresql://...`

Current implementation note: `mongodb+srv://` is the MongoDB scheme that works through both the dispatcher and Mongo adapter. The dispatcher routes `mongo://`, but the Mongo adapter currently validates for `mongodb://` or `mongodb+srv://`.

SQLite is the built-in default:

```yaml
database:
  connection: sqlite://IN-MEMORY-DB
```

PostgreSQL and MongoDB are selected by connection string in config:

```yaml
database:
  connection: postgresql://user:password@host:5432/dbname
```

```yaml
database:
  connection: mongodb+srv://user:password@cluster.example/dbname
```

---

## Related References

- CLI Reference
- Database Configuration
- Runtime Capabilities
