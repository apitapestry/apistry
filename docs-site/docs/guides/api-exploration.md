# API Exploration & Functional Testing

This guide explains how to **explore and verify** an Apistry-powered API.

It focuses on functional validation of:

- your OpenAPI contract
- the Apistry runtime

This is not unit testing.

---

## Primary Tool: Swagger UI

Every Apistry service exposes Swagger UI at:

```
/swagger-ui
```

Swagger UI allows you to:

- inspect the live contract
- execute requests interactively
- validate request/response behavior

This should be your first stop when exploring an API.

---

## Sanity Checks

A minimal verification flow:

```bash
curl http://localhost:3000/v1/resources
```

Successful response confirms:

- server is running
- routing is active
- persistence is functional

Anything beyond this belongs in guides or examples.

---

## Postman Collection

A Postman collection is provided for convenience.

Use it to:

- explore endpoints
- validate filters
- experiment safely

Postman is optional. Swagger UI is canonical.

---

## What This Guide Does Not Cover

- unit testing strategies
- performance testing
- database tuning
- CI pipelines

Those concerns are application-specific.

---
