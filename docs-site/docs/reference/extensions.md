# OpenAPI Contract Extensions Reference

This document defines and catalogs all Apistry-supported **OpenAPI extensions (`x-*`)**. Extensions are used to express semantics that cannot be represented using standard OpenAPI alone. This reference includes both design principles and a quick summary table for fast lookup.

---

## Summary Table

| Extension           | Purpose / Usage Context                                  |
|---------------------|----------------------------------------------------------|
| `x-context`         | Method-scoped rules for object schemas                   |
| `x-primary-key`     | Marks a field as the primary identifier                  |
| `x-insert`/`x-update`| Server-side value sources for server-owned fields        |
| `x-query`           | Marks a field as queryable                              |
| `x-query-pattern`   | Defines wildcard matching for queries                    |
| `x-soft-delete`     | Enables soft delete semantics for a resource             |
| `x-ignore-merge`    | Ignore property during merge (internal/merge logic)      |
| `x-format`          | Custom display format for fields                         |
| `x-allowed-methods` | Allowed HTTP methods for a resource                      |
| `x-collection`      | Backing collection name                                  |
| `x-etl-transforms`  | ETL transformation metadata (internal)                   |
| `x-orchestration`   | Feature flag for orchestration logic                     |
| `x-validations`     | Custom validation rules                                  |
| `x-filters`         | Custom filters for query operations                      |

---

## Design Principles

Extensions in Apistry:
- are explicit
- have well-defined scope
- are enforced by the runtime where required
- do not introduce hidden behavior

Unsupported extensions are ignored.

Authoring correctness is expected to be validated by tooling (linters), not duplicated at runtime.

---

## Extension Details

### `x-context`
Defines method-scoped rules for object schemas.

**Supported Properties:**
- `required`
- `prohibited`

These rules apply only within the context of a specific operation.

---

### `x-primary-key`
Marks a field as the primary identifier for a resource.

**Rules:**
- must be unique
- must be immutable
- typically marked `readOnly`

---

### `x-insert` and `x-update` (Server-Owned Fields)
The `x-insert` and `x-update` extensions define **server-side value sources** for **server-owned fields**. They are not general mutation hooks.

**Applicability:**
- Intended only for fields marked `readOnly: true`.
- If applied to fields without `readOnly: true`, the extensions have **no runtime effect** (authoring error, flagged by linter).

**Lifecycle Semantics:**
- `x-insert` is evaluated during resource creation (`POST`).
- `x-update` is evaluated during resource updates (`PATCH`).
- Values are generated **after request validation** and **before persistence**.
- Generated values apply only to server-owned (`readOnly`) fields.

**Client Interaction:**
- If a client supplies a value for a field marked `readOnly: true`, the value is removed from the incoming payload and ignored.

---

### `x-query`
Marks a field as queryable.

**Rules:**
- Only fields explicitly marked queryable may be filtered.
- Prevents accidental full-document scanning.

---

### `x-query-pattern`
Defines how a field supports wildcard matching.

**Examples:**
- prefix
- suffix
- contains

If omitted, wildcard queries are rejected.

---

### `x-soft-delete`
Enables soft delete semantics for a resource.

**Requirements:**
- A boolean or timestamp field must be designated.
- Delete operations update the field instead of removing the record.
- Query behavior must explicitly include or exclude soft-deleted records.

**Applicability:**
- `x-soft-delete` **MUST NOT** be applied to sub-resources. Applies only to top-level resources (collections).
- Soft delete is opt-in and explicit.

---

### `x-ignore-merge`
Used to signal that a property should be ignored during merge operations. The merge logic in the codebase checks for this flag.

---

### `x-format`
Custom format string for displaying item ranges or other field-specific formatting.

---

### `x-allowed-methods`
Specifies allowed HTTP methods for the resource.

---

### `x-collection`
Indicates the backing collection for the resource.

---

### `x-etl-transforms`
ETL transformation metadata, used internally and removed from schemas during contract processing.

---

### `x-orchestration`
Feature flag for enabling orchestration logic in handlers and plugins.

---

### `x-validations`
Custom validation rules for request payloads, evaluated during validation.

---

### `x-filters`
Custom filters for query operations, added to request queries.

---

## Uniqueness Rules (Additive)
- `uniqueItems: true` is the **only** schema-level mechanism Apistry uses to enforce uniqueness in arrays.
- If `uniqueItems` is absent (or `false`), duplicates are allowed for primitive arrays.
- For object arrays, Apistry does not infer duplicates without explicit alternate-key modeling.
- Top-level uniqueness is typically enforced via database indexes (outside Apistry).

---

## Extension Enforcement
- Extensions are validated at startup for structural correctness.
- Unsupported extensions are ignored.
- Invalid extension usage that affects runtime safety prevents server startup.
- Misuse is ignored at runtime and flagged by linters.
- Behavior is deterministic and non-magical.
- Extensions never bypass lifecycle rules.

---

## Summary
- Extensions express intent, not logic.
- Server-owned fields are explicit.
- Misuse is ignored at runtime and flagged by linters.
- Behavior is deterministic and non-magical.
- Extensions never bypass lifecycle rules.
