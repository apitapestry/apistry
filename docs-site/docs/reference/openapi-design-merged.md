# OpenAPI Contract Rules

This document defines **how Apistry interprets OpenAPI contracts**.
All rules described here are enforced or intentionally *not enforced* by design.

---

## Canonical Schemas

- Schemas represent canonical data models
- `readOnly` and `writeOnly` semantics are enforced
- Inline anonymous schemas are discouraged
- Schema names are part of the public contract identity

---

## Resource Paths

- Resource paths must be plural
- Top-level resources represent collections
- Sub-resources represent parent-owned arrays
- Only one level of sub-resource nesting is supported

---

## HTTP Method Semantics

- `POST` creates new resources
- `PATCH` updates existing resources
- `PUT` is restricted and discouraged
- `DELETE` removes resources

Certain combinations are intentionally invalid.

---

## Contract Loading and Merging (Important)

Apistry may be started with:
- a **single OpenAPI contract**, or
- a **directory of OpenAPI contracts**

When a directory is provided, Apistry performs a **simple, non-intelligent merge**.

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

## Design Implications

Because merging is shallow and override-based:

- Accidental overrides are possible
- Ordering matters
- Conflicts are silent
- Debugging requires awareness of load order

This is a tradeoff in favor of startup simplicity and predictability.

---

## Recommended Practices

If your use case requires:
- conflict detection
- schema reconciliation
- deep merges
- validation across files

Then you should:

1. Merge contracts **before** starting Apistry
2. Validate the merged result using your preferred tooling
3. Start Apistry with the single, merged contract

Apistry intentionally does not implement a complex merge engine.

---

## Summary

- Contract merging is shallow and deterministic
- Duplicate keys are overridden silently
- No validation is performed during merge
- Advanced merging must happen outside the runtime

This keeps Apistry focused on execution, not authoring workflows.
