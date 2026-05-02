# Validation Reference

This page is the **mechanical reference** for how to declare validations in Apistry contracts.

For the conceptual model (why validation exists, what boundary it protects, and what does *not* belong at the API layer), see **Core Concepts → Validation Model**.

---

## Audience

- **Implementer**: needs exact syntax and where validations are allowed

---

## Where validations are declared

Validations are declared in the OpenAPI contract using contract extensions (commonly `x-validations`).

They may be attached at different schema levels depending on the validation:

- property-level (single field)
- object-level (cross-field constraints)
- array-level (collection rules)

The runtime evaluates these validations **before persistence**.

---

## Execution rules (guarantees)

- Validations are **declarative** and draw from a **finite catalog**.
- Validation evaluation is **deterministic** and **side-effect free** (except where explicitly documented for specific platform validations).
- Validation failures map to **HTTP 422**.
- Validators do not select HTTP status codes; error mapping is owned by the runtime.

---

## Validation function catalog

The full list of built-in validation functions is documented under:

- `reference/validations/`

Each validation page documents:

- intent and scope
- supported schema locations
- parameters
- examples

---

## Related references

- Contract extensions: `reference/contract-extensions.md`
- Error mapping: `reference/error-codes-and-status-mapping.md`

