# Database Configuration

This page documents the database connection behavior implemented by the current runtime.

---

## Default Database

The built-in default is in-memory SQLite:

```yaml
database:
  connection: sqlite://IN-MEMORY-DB
```

This lets Apistry start without an external database. Data is lost when the process stops.

---

## SQLite

SQLite is selected with a `sqlite://` connection string.

In-memory:

```yaml
database:
  connection: sqlite://IN-MEMORY-DB
```

Filesystem-backed:

```yaml
database:
  connection: sqlite://data/sqlite.db
```

When `sqlite://` points to a filesystem path, Apistry resolves that path relative to the current working directory.

The `apistry start --dbDir <path>` option is a convenience for SQLite. It overrides the configured database connection with:

```text
sqlite://<resolved-path>
```

Use `--dbDir IN-MEMORY-DB` for in-memory SQLite.

---

## MongoDB

MongoDB is selected by connection string:

```yaml
database:
  connection: mongodb+srv://user:${MONGO_PASSWORD}@cluster.example/apistry
```

Current implementation note: `mongodb+srv://` is the MongoDB scheme that works end-to-end through both the database dispatcher and Mongo adapter. The dispatcher also routes `mongo://`, but the Mongo adapter currently validates for `mongodb://` or `mongodb+srv://`, so local non-SRV Mongo connection strings need code alignment before they are reliable.

---

## PostgreSQL

PostgreSQL is selected by connection string:

```yaml
database:
  connection: postgresql://user:${POSTGRES_PASSWORD}@localhost:5432/apistry
```

The database dispatcher recognizes both `postgres://` and `postgresql://`.

---

## Unsupported Database Types

If the connection string uses an unsupported scheme, startup fails with a configuration error.

Supported schemes are:

- `sqlite`
- `mongodb+srv`
- `postgres`
- `postgresql`

The dispatcher also recognizes `mongo`, but the Mongo adapter currently rejects `mongo://` during connection validation.

---

## Environment Variables

Config files support `$VAR` and `${VAR}` substitution:

```yaml
database:
  connection: postgresql://user:${POSTGRES_PASSWORD}@localhost:5432/apistry
```

Unset variables are substituted as empty strings during config loading.
