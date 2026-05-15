# Error Codes & Status Mapping

This document defines how Apistry maps failures to **HTTP status codes** and **error payloads**.

The goal is predictability:
- clients can reliably interpret failures
- operators can distinguish configuration vs runtime issues
- errors are never ambiguous

---

## Error Classification

All errors fall into one of the following categories.

### Configuration Errors

Errors detected during startup or initialization.

Examples:
- missing contract directory
- invalid OpenAPI documents
- invalid configuration file

**Characteristics**
- server does not start
- fatal during startup
- may also appear as HTTP 500 if a required runtime dependency is missing during request handling

---

### Validation Errors

Errors caused by invalid client input.

Examples:
- schema violations
- missing required fields
- invalid query parameters
- prohibited fields in mutation requests

**HTTP Status**
- `400 Bad Request` for general Fastify schema validation failures
- `422 Unprocessable Entity` for invalid additional query parameters and contract-declared `x-validations`

**Characteristics**
- client-visible
- deterministic
- no side effects

---

### Authorization / Access Errors

Errors caused by insufficient permissions or invalid credentials.

**HTTP Status**
- `401 Unauthorized`
- `403 Forbidden`

These errors are surfaced before request processing begins.

---

### Runtime Errors

Errors that occur during request processing.

Examples:
- database adapter failures
- action execution failures
- external HTTP dependency failures from `httpCheck`
- unexpected exceptions

**HTTP Status**
- `500 Internal Server Error`

**Characteristics**
- server-visible
- logged with full context
- not masked or retried implicitly

---

## Status Code Normalization

Apistry may normalize certain status codes to preserve consistency.

Examples:
- `201 Created` responses may be returned as `200 OK` when the persisted resource is immediately available
- bulk operations may return `200 OK` even when individual items were created or deleted

Normalization is intentional and documented behavior.

---

## Error Payload Shape

Error response shape depends on the error class.

`x-validations` and invalid additional query parameters return an array of error items:

```json
[
  {
    "message": "Query parameter 'bogus' is not valid",
    "objectName": "querystring",
    "property": "bogus",
    "rejectedValue": "1"
  }
]
```

General errors return an object:

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An error occurred"
}
```

### Fields

- `statusCode` – HTTP status code
- `error` – HTTP error name for object-shaped errors
- `message` – human-readable description
- `property`, `objectName`, and `rejectedValue` – structured fields used in array-shaped validation errors

---

## What Apistry Does Not Do

Apistry does not:
- hide failures
- retry requests implicitly
- return partial success states
- encode business meaning into error responses

Those behaviors belong to application-specific systems.

---

## Operation response shapes (additive)

Apistry supports multiple success shapes for certain operations. Response shape is contract-driven.

| Operation | Success statuses | Notes |
|---|---|---|
| Create (POST) | 201 by default | The formatter uses the selected successful response code; POST defaults to 201 when no response schema is selected. |
| Update many | 200 | Best-effort; partial success is possible and failures are surfaced in the response. |
| Delete many | 200, 204 | May return deleted items (optionally wrapped) or no content. |
| Sub-resource mutation | 200, 204 | May return status-only or the full updated array; mutated-only responses are not supported. |

---

## Duplicate-related errors (additive)

Duplicates may be rejected at different layers:

- **Schema-level** (primitive arrays with `uniqueItems: true`): request fails validation (often 400/422 per contract).
- **Database-level** (unique indexes): database rejects the write; the error is surfaced to the client.

## Summary

- Errors are classified and predictable
- Status codes are intentional
- Payloads are structured and stable
- Ambiguity is rejected by design
