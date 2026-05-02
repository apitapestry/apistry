# Validation Model (Concepts)

Apistry uses validation to protect a strict architectural boundary:

- **Persistence establishes durable truth**.
- **Persistence is the execution boundary**.

Validation exists only to determine whether an incoming request represents a fact that may be safely persisted.

This page explains *why* validation exists in Apistry and *when* it applies. For exact syntax and the full catalog of validation functions, see the **Validation Reference**.

---

## Audience

- **Architect**: understand the boundary and what belongs (and does not belong) at the API layer
- **Implementer**: understand how to express admissibility rules in contracts without turning APIs into workflows

---

## What validation is (in Apistry)

Validation in Apistry is:

- **Contract-driven**: declared in OpenAPI via contract extensions (for example, `x-validations`)
- **Deterministic**: the same input produces the same result
- **Pre-persistence**: evaluated **before** any write is committed
- **Finite and governed**: validations are a closed set of platform-provided functions (no arbitrary user code)

Validation failures represent invalid client input and return **HTTP 422 Unprocessable Entity**.

---

## What validation is not

To preserve the execution boundary, validations must not become an execution engine.

Validations do **not**:

- interpret business meaning beyond admissibility
- perform workflows or orchestration
- trigger side effects
- enrich or transform data via arbitrary code

> External checks are permitted only where explicitly supported by the platform (for example, a single-purpose external admissibility validator). They remain declarative and bounded.

---

## Relationship to schema validation

Apistry combines:

1. **Schema validation** (types, formats, required, patterns)
2. **Semantic admissibility validation** (cross-field, conditional, temporal, referential checks)

Schema validation ensures structural correctness.
Semantic validation ensures the payload is admissible for persistence.

---

## Error semantics

- **422 Unprocessable Entity**
  - schema validation failures
  - validation constraint failures
  - contract-defined admissibility violations

- **5xx**
  - reserved for system failures (including unreachable dependencies when a platform validation is allowed to call out)

Validators do not choose status codes. The runtime applies a consistent mapping.

---

## Where to go next

- **Mechanical syntax**: `reference/validation-reference.md`
- **Validation function catalog**: `reference/validations/*`
- **Boundary framing**: `getting-started/architecture.md` and `getting-started/concepts.md`

