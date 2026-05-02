# System Endpoints

System endpoints are **Apistry-owned APIs** that expose runtime state, diagnostics, and operational signals.

They are **not domain resources**, are **not persisted**, and are **not extensible**.
Their purpose is to make the running service observable, verifiable, and operable.

---

## Visibility and Contract Control (Important)

System endpoints are **only available if they are explicitly included in the loaded OpenAPI contracts**.

- If a system endpoint is **not present** in the provided contract list, it is **not accessible**
- If only a subset of system endpoints is provided, **only that subset is available**
- No system endpoint is implicitly added at runtime

This guarantees:

- Swagger UI always reflects **exactly** what is available
- There are **no hidden endpoints**
- Operators and developers see the same surface area
- Access control is contract-driven, not magic-driven

Apistry does not expose endpoints that are not declared.

---

## What System Endpoints Are Not

System endpoints are not:

- CRUD APIs
- business-domain resources
- backed by persistence
- customizable by users
- subject to lifecycle stages like validation, normalization, or persistence

They are owned and implemented entirely by Apistry.

---

## Categories of System Endpoints

System endpoints are grouped by intent.

---

### Health & Readiness

These endpoints indicate whether the service is running and able to accept traffic.

Typical responsibilities:
- process liveness
- startup completion
- dependency availability (when applicable)

Examples:
- `/health`
- `/ready`
- `/live`

Failure of these endpoints indicates a service-level issue, not a domain error.

---

### Runtime State & Metadata

These endpoints expose static or semi-static information about the running service.

Typical information:
- service version
- build metadata
- runtime environment
- enabled features

These endpoints are intended for operators and automation tools.

---

### Metrics & Observability

These endpoints expose metrics suitable for monitoring and alerting.

Typical characteristics:
- machine-readable format
- counters and timers
- reset on process restart unless otherwise stated

Examples:
- `/metrics`

The exact metric set is implementation-defined but stable within a version.

---

### Diagnostics & Validation

These endpoints provide insight into configuration and runtime wiring.

Typical use cases:
- validating database connectivity
- verifying contract loading
- inspecting adapter availability
- exposing registry or catalog state

These endpoints are read-only and do not mutate system state.

---

## Discovery via Swagger UI

Because system endpoints are contract-defined:

- Swagger UI always shows **all and only** available system endpoints
- Operators can explore behavior interactively
- No separate documentation registry is required

The OpenAPI contract is the authoritative source of truth.

---

## Stability Guarantees

- System endpoints are versioned
- Behavior changes are documented
- Breaking changes require a version bump
- Undeclared endpoints are never exposed

---

## Summary

- System endpoints expose Apistry runtime behavior
- They are contract-controlled and explicit
- Nothing is hidden, nothing is added
- Swagger UI always reflects reality
- Operational visibility is intentional and bounded
