# Validation & Coercion Semantics

This guide explains how Apistry validates and coerces input, and where those behaviors are intentionally constrained to preserve semantic correctness.

Understanding these rules is critical to designing safe contracts and avoiding subtle data corruption.

---

## Validation Ownership

Apistry validates requests in two distinct domains:

- **Transport-level validation**

    - Query parameters
    - Path parameters
    - Headers

- **Domain-level validation**

    - Request bodies
    - Persistence semantics
    - Server-owned fields

Transport-level validation is handled by Fastify and AJV. Domain-level validation is owned by Apistry.

This separation is intentional.

---

## Why Coercion Exists

HTTP parameters are strings by default. Coercion allows values like:

```http
GET /cars?limit=10
```

to be interpreted as:

```json
{ "limit": 10 }
```

Without coercion, common API usage becomes painful and error-prone.

---

## Where Coercion Is Applied

### Query and Path Parameters

- Coercion **is enabled**
- Types are converted according to the OpenAPI schema
- This behavior is considered safe and expected

### Request Bodies

- Coercion is **not trusted**
- Bodies may contain semantic signals (`null`, missing fields, partial updates)
- Automatic coercion risks destroying intent

Example risk:
- `null` → `0` for numeric fields
- Loss of delete semantics
- Mutation before normalization

Because of this, Apistry treats request bodies as **semantically sensitive**.

---

## Property = null Semantics

In Apistry:

- `null` is meaningful
- missing properties are null properties
- to keep model clean and consistent, null properties are removed from schema

---

## Current Behavior (Intentional)

Today:

- Query/path coercion is enabled
- Body coercion is constrained
- Defaults and normalization are applied explicitly by Apistry
- Known edge cases are documented, not hidden

This is a deliberate tradeoff favoring correctness over convenience.

---

## Future Direction (High Level)

Apistry may further separate transport validation from domain validation internally.

This would:
- Eliminate body coercion entirely at the transport layer
- Centralize semantic validation inside Apistry
- Strengthen contract guarantees

This work is architectural and intentionally deferred.
