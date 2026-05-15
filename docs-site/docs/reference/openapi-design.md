# OpenAPI Contract Rules

This document defines **how Apistry interprets OpenAPI contracts**.
All rules described here are enforced or intentionally *not enforced* by design.

---

## Canonical Schemas

- Schemas define canonical data
- `readOnly` / `writeOnly` semantics are enforced
- Inline schemas are discouraged

---

## Paths and Resources

- Resource paths must be plural
- Sub-resources represent ownership
- Only one level of sub-resources is supported

---

## Method Semantics

- `POST` creates
- `PATCH` updates
- `PUT` is restricted
- `DELETE` removes

Certain combinations are intentionally invalid.

---

## Defaults

- Required fields must not be nullable
- Nullable fields carry explicit intent

---

## Contract Loading and Merging (Important)

Apistry may be started with:
- a **single OpenAPI contract**, or
- a **directory of OpenAPI contracts**

When a directory is provided, Apistry performs a **simple, shallow merge**.

### Merge Behavior

- Contracts are loaded in filesystem order
- Paths are merged by key
- Components are merged by key
- **If a path or component key is duplicated, the later definition overrides the earlier one**
- No warning, error, or validation is emitted

This behavior is **intentional**.

Apistry does not attempt to:
- deep-merge schemas
- reconcile conflicts
- detect incompatible definitions
- infer author intent

The last definition wins.

---

## Summary

- Contract merging is shallow and deterministic
- Duplicate keys are overridden silently
- No validation is performed during merge
- Advanced merging must happen outside the runtime

This keeps Apistry focused on execution, not authoring workflows.
