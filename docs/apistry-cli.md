# Apistry CLI

The Apistry CLI (`apistry`) is the primary interface for running the Contract as a Service runtime locally, testing database connectivity, and performing utility operations on MongoDB collections.

## Environment Configuration

The CLI loads environment variables from a `.env` file. By default it looks for `.env` in the current working directory. Use `-e/--env <dir>` to point to a directory that contains the `.env` file.

Required:
- `DB_CONNECTION` – MongoDB connection string including database name

Optional:
- `LOG_LEVEL` – `debug | info | warn | error` (default: `info`)
- `ENABLE_AUTO_COLLECTION_CREATE` – `y | yes | true | n | no | false` (default: `n`)

Example `.env`:
```env
DB_CONNECTION=mongodb://localhost:27017/mydb
LOG_LEVEL=info
```

## Commands

### 1. `serve`
Start the API development server from one or more OpenAPI contracts.

```bash
apistry serve -c path/to/contract.yaml
```

**Options:**

- `-c, --contract <string>` (required) Path to the OpenAPI contract file (YAML or JSON). You can pass relative paths.
- `-h, --host <string>` Host interface to bind (default: `localhost`). Use `0.0.0.0` to allow external access.
- `-p, --port <number>` Port to listen on (default: `3000`).
- `-ll, --logLevel <string>` Log level (`debug|info|warn|error`) (default: `info`).
- `-e, --env <string>` Directory containing a `.env` file.
- `--enableAutoCollectionCreate <value>` Automatically create missing MongoDB collections referenced by tags (`y|yes|true|n|no|false`, default: `n`).

**Behavior:**

1. Loads environment variables.
2. Validates `DB_CONNECTION`.
3. Loads and merges the provided contract(s) (future multi-contract support).
4. Validates that tagged MongoDB collections exist; prompts or auto-creates depending on `--enableAutoCollectionCreate`.
5. Starts a Fastify server and registers Swagger UI at `/docs`.

**Startup Output (info level):**

```
Loading Contract: contracts/dist-wip/cars.v1.yaml
✅ All required collections exist in database
📚 Swagger UI available at /docs
Loaded 14 routes successfully
🚀 Server running on http://localhost:3000
📖 API Documentation: http://localhost:3000/docs
```

Use `--logLevel debug` for detailed structured logs (request/response, validation traces).

**Examples:**

```bash
# Basic
apistry serve -c contracts/dist-wip/cars.v1.yaml

# Different host & port
apistry serve -c contracts/dist-wip/cars.v1.yaml -h 0.0.0.0 -p 8080

# Auto-create missing collections
apistry serve -c contracts/dist-wip/cars.v1.yaml --enableAutoCollectionCreate yes

# Custom env directory
apistry serve -c contracts/dist-wip/cars.v1.yaml -e ../..
```

**Common Errors:**

- `Missing DB_CONNECTION environment variable.` – Provide `.env` or export the variable before running.
- `Error starting server: <message>` – Contract parsing or Fastify initialization failed.

**Exit Codes:**

- `0` Success
- `1` Failure (missing env, server start error)

### 2. `testConnection`
Validate connectivity to MongoDB defined by `DB_CONNECTION`.

```bash
apistry testConnection
```

**Options:**

- `-e, --env <string>` Directory containing `.env`.

**Behavior:**

1. Masks password in displayed connection string.
2. Connects and performs a ping command.
3. Prints database name extracted from URI.

**Example Output:**

```
🔍 Testing MongoDB connection...
📍 Connection string: mongodb://user:****@localhost:27017/mydb
⏳ Connecting to MongoDB...
✅ Success! You are connected to MongoDB!
📊 Pinged your deployment successfully.
📂 Database name: mydb
🔌 Connection closed.
```

**Failure Example:**

```
❌ Connection failed: authentication failed
```

(Exit code 1)

### 3. `clearCollection`
Delete all documents from a specified MongoDB collection (with interactive confirmation).

```bash
apistry clearCollection -cn cars
```

**Options:**

- `-cn, --collectionName <string>` (required) Name of the collection to clear (automatically lowercased).
- `-e, --env <string>` Directory containing `.env`.

**Behavior:**

1. Counts documents.
2. Prompts for confirmation.
3. Deletes all documents if confirmed.
4. Reports number deleted.

**Example Output:**

```
🔍 Clearing collection...
📍 Connection string: mongodb://user:****@localhost:27017/mydb
📁 Collection: cars
⏳ Connecting to MongoDB...
📊 Collection "cars" contains 42 document(s)
⚠️  Are you sure you want to delete all 42 document(s) from "cars"? (Y/n) Y
🗑️  Deleting all documents from collection...
✅ Successfully cleared collection "cars"
📊 Deleted 42 document(s)
🔌 Connection closed.
```

**Cancellation:**

```
❌ Operation cancelled.
```

**Exit Codes:**

- `0` Success / Cancelled
- `1` Failure (connection or operation error)

## Logging Modes

Logging is optimized for readability at `info` and detail at `debug`.

- `info`: Minimal human-friendly messages (each on its own line).
- `debug`: Includes timestamps, levels, and structured objects (requests, validation details, error stacks).

Set via environment or CLI option:
```bash
LOG_LEVEL=debug apistry serve -c contracts/dist-wip/cars.v1.yaml
# or
apistry serve -c contracts/dist-wip/cars.v1.yaml -ll debug
```

## Auto-Collection Creation

When starting the server the tag names in the OpenAPI contract are treated as collection names. If collections are missing you can:
- Be prompted (default behavior)
- Auto-create with `--enableAutoCollectionCreate yes`

See detailed flow in `collection-auto-creation.md`.

## Security & Safety

- Connection string masking hides the password portion in CLI output.
- Validation errors are summarized; full detail only in `debug` mode.
- Clear operations require explicit confirmation.

## Troubleshooting

| Symptom | Possible Cause | Resolution |
|---------|----------------|-----------|
| `Missing DB_CONNECTION` | `.env` not found or variable unset | Create `.env` or export variable |
| Server starts but no routes loaded | Contract path incorrect | Verify `-c` path exists |
| `authentication failed` during testConnection | Wrong credentials / authSource | Update connection string with correct user/password and database |
| Logs are one long line | Old config caching / terminal quirk | Restart shell; ensure `singleLine` disabled |
| Swagger not available at `/docs` | Plugin load failure | Run with `-ll debug` and inspect error output |

## Help

Show global help:
```bash
apistry --help
```
Show command-specific help:
```bash
apistry serve --help
apistry testConnection --help
apistry clearCollection --help
```

---
**Next:** Explore the generated API via the Swagger UI at `/docs` after running `serve`.
