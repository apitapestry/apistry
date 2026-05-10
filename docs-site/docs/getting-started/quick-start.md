# Quick Start

## 1. Install

```bash
npm install -g apistry
```

## 2. Get Example Contracts

Example contracts are available in the docs site:

- [Books](/contracts/books.v1.yaml)
- [Cars](/contracts/cars.v1.yaml)
- [Notes](/contracts/notes.v1.yaml)
- [Swapi v1](/contracts/swapi.v1.yaml)
- [Swapi v2](/contracts/swapi.v2.yaml)
- [Utils](/contracts/utils.v1.yaml)
- [Videos](/contracts/videos.v1.yaml)

Download the sample bundle:

```bash
curl -o contracts.zip https://www.apistry.net/docs.zip
unzip -q contracts.zip
```

You can also point Apistry at any directory containing OpenAPI contracts.

## 3. Start the Server

Start with the default in-memory SQLite database:

```bash
apistry start --contract ./contracts
```

Start with a filesystem-backed SQLite database:

```bash
apistry start --contract ./contracts --dbDir ./data/sqlite
```

Start from a config file:

```bash
apistry start --config ./config.yml
```

The server listens on the configured host and port. By default, the built-in config uses `localhost:3000`.

Swagger UI is available at:

```text
http://localhost:3000/swagger-ui
```

## 4. Make API Calls

Example requests:

```bash
curl "http://localhost:3000/v1/cars" -H "accept: application/json"
curl "http://localhost:3000/v1/cars?color=Blue" -H "accept: application/json"
```

Sub-resource examples:

- `GET http://localhost:3000/v1/cars/{carid}/features`
- `GET http://localhost:3000/v1/cars/{carid}/events`

## What Just Happened?

Apistry:

- read your OpenAPI contracts
- derived routes, validation, and persistence behavior
- connected to SQLite
- exposed Swagger UI for exploration

No controller or route code was written.

## When Do I Write Code?

Most CRUD, query, validation, and response-shaping behavior is contract-driven.
Custom code is only needed when you add orchestration actions or external integration behavior that cannot be expressed declaratively.
