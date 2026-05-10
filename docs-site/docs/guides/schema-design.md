# Schema Design Patterns

This guide documents schema patterns that work well with Apistry’s runtime model.
These patterns exist to **prevent ambiguity** and **protect lifecycle guarantees**.

If a rule is absolute and enforced, it belongs in Reference.
This guide explains *why* certain shapes work better.

---

## Pattern vs Length

Use:

- `pattern` to constrain **allowed characters/structure**.
- `minLength` / `maxLength` to constrain **length**.

Do not encode length constraints inside regex patterns. Keep patterns focused on character sets and structural rules.

### Example: VIN

A VIN is 17 characters and excludes I, O, Q.

```yaml
vin:
  type: string
  pattern: ^[A-HJ-NPR-Z0-9]+$
  minLength: 17
  maxLength: 17
```

---

## Required vs Nullable (Critical)

**Required fields MUST NOT be nullable.**

- `required` means the field must always exist
- `nullable` means `null` is a meaningful value

Combining them destroys intent and leads to undefined behavior.

If a field must always exist, it must also always have a value.

---

## PUT vs PATCH

- **PUT**

    - Full replacement
    - All required fields must be present
    - Rarely appropriate at top-level resources

- **PATCH**

    - Partial update
    - Missing fields are untouched
    - `null` may indicate explicit deletion

Apistry strongly favors PATCH semantics.

---

## Identifiers

- IDs should be immutable
- IDs should be server-owned by default
- IDs should be marked `readOnly` where possible
- Sub-resources MUST have identifiers to support mutation

Avoid client-generated IDs unless the contract explicitly requires them.

---

## Arrays vs Sub-Resources

- Arrays are appropriate for:

    - small, bounded sets
    - value objects

- Sub-resources are appropriate for:

    - large collections
    - independently addressable items
    - mutable child entities

Apistry supports **only one level of sub-resource nesting** by design.

---

## Read-Only and Write-Only Fields

- Use `readOnly` for server-managed fields
- Use `writeOnly` for sensitive inputs

Do not attempt to update `readOnly` fields, including within nested objects.

---

## Bulk Operations (Use Carefully)

Bulk update and delete operations:

- are intentionally constrained
- require explicit filters
- do not support implicit fan-out semantics

Design contracts assuming **explicit intent**.

---

## Naming Discipline

- Resource names should be plural
- Sub-resource names should be plural
- Avoid multi-path ambiguity

Consistency here prevents routing and lifecycle ambiguity.

---
