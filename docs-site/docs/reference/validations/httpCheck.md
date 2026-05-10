# httpCheck

`httpCheck` is a validation rule that performs a **single outbound HTTP request** to validate request data against an **authoritative external system**.

This validator exists to support **admissibility checks** such as existence validation, eligibility verification, and risk evaluation. It is **not** a workflow engine and must not be used for orchestration, enrichment, or side effects.

`httpCheck` is the **only validation rule** permitted to perform outbound HTTP calls.

---

## Design Principles

`httpCheck` is intentionally constrained and follows these principles:

- **Contract-driven**: Declared declaratively in the API contract under `x-validations`.
- **Deterministic**: The same inputs produce the same validation outcome.
- **Bounded**: Exactly one outbound HTTP call per validation.
- **Non-orchestrating**: No branching, retries, chaining, or side effects.
- **Admissibility-focused**: Determines whether a request may be persisted; it does not control downstream behavior.

If a validation requirement cannot be expressed within these constraints, it does **not** belong in `httpCheck`.

---

## HTTP Semantics

### Supported Methods

Only the following HTTP methods are allowed:

- `GET` — fact lookup
- `POST` — fact evaluation

All other methods (`PUT`, `PATCH`, `DELETE`, etc.) are explicitly disallowed and will cause contract validation to fail.

### Status Code Handling

- **HTTP 2xx**: Considered a successful call *unless response assertions fail*.
- **HTTP 4xx**: Treated as a validation failure → client receives **422 Unprocessable Entity**.
- **HTTP 5xx**: Treated as an external dependency failure → client receives **500 Internal Server Error** after configured retries are exhausted.
- **Unreachable dependency**: DNS failure, timeout, or connection error → **500 Internal Server Error**  
  (`httpCheck` reserves 500 for upstream 5xx, non-JSON responses, and network/infrastructure failures.)

---

## Configuration Model

### External Sources (`config.yml`)

All outbound endpoints, authentication, and security configuration **must be defined in `config.yml`**, not in the contract.

This provides a centralized place to manage:
- Base URLs
- Credentials and secrets
- Timeouts and connection settings
- Retries

#### Example `config.yml`

```yaml
externalSources:
  accountsApi:
    baseUrl: https://accounts.internal
    timeoutMs: 500
    retries: 1
    auth:
      type: bearer
      tokenEnv: ACCOUNTS_API_TOKEN

  riskApi:
    baseUrl: https://risk.vendor.com
    timeoutMs: 1000
    retries: 0
    auth:
      type: apiKey
      header: X-API-Key
      valueEnv: RISK_API_KEY
```

Contracts reference these sources by name. No credentials or vendor URLs appear in the contract.

---

## Contract Structure

### Placement Rules (Important)

`httpCheck` is **object-level only**.

- ✅ Allowed: `x-validations` on an **object schema** (e.g. a request body schema or a nested `type: object` property).
- ❌ Not allowed: `x-validations` on an individual **property**.

Reason: `httpCheck` performs an outbound HTTP call. Keeping it object-level prevents accidental N× external calls when validating N properties.

All other validation rules are **property-level only** (they must be attached to a field schema).

### Basic Shape

```yaml
x-validations:
  - httpCheck:
      source: <externalSourceName>
      request: ...
      response: ...
      assertThat: ...
```

Each `httpCheck` is self-contained and deterministic.

---

## Request Definition

### Request Fields

| Field   | Required | Description                  |
|---------|----------|------------------------------|
| method  | yes      | GET or POST                  |
| path    | yes      | Path relative to the source  |
| bind    | yes      | Maps request values to named bindings |
| query   | no       | Query parameters (GET only)  |
| body    | no       | JSON body (POST only)        |

#### Bindings (Required)

Bindings declare exactly which values from the incoming request may be sent externally.

```yaml
bind:
  accountId: $.body.accountId
  personId: $.body.personId
```

Bindings:
- Use JSONPath
- Are evaluated once
- Must all resolve successfully
- May be reused in path, query, headers, or body

Bindings make data flow explicit and auditable.

---

## GET Example (Existence Check)

Validate that a referenced course exists.

```yaml
x-validations:
  - httpCheck:
      source: coursesApi
      request:
        method: GET
        path: /courses/{courseId}
        bind:
          courseId: $.body.courseId
      response:
        bind:
          responseCode: $response.status
      assertThat:
        - property: responseCode
          operator: equals
          value: 200
```

**Behavior:**
- If the course is found → validation passes
- If the response assertions fail → validation fails (422)
- If the dependency returns 5xx or cannot be reached → request fails with 500

---

## POST Example (Risk Evaluation)

Submit external account data for risk scoring.

```yaml
x-validations:
  - httpCheck:
      source: deliveryVerificationApi
      request:
        method: POST
        path: /providers/verify
        bind:
          providerId: $.body.deliveryProvider.providerId
          region: $.body.deliveryProvider.region
          ownerId: $.body.ownerId
        body:
          providerId: "{providerId}"
          region: "{region}"
          requestedBy: "{ownerId}"
      response:
        bind:
          responseCode: $response.status
          approved: $response.body.verification.approved
          denyListed: $response.body.verification.denyListed
          reliabilityScore: $response.body.verification.score
      assertThat:
        - property: responseCode
          operator: equals
          value: 200
        - property: approved
          operator: equals
          value: true
        - property: denyListed
          operator: equals
          value: false
        - property: reliabilityScore
          operator: '>'
          value: 75
```

**Notes:**

- POST bodies must be explicitly constructed
- Whole-body passthrough is not allowed
- Multiple assertions imply logical AND (all must pass)

---

## Response Handling

### Response Block (Bind Only)

The `response` block is **bind-only**.

- `response.bind` declares the **only** response-derived values that may be used.
- No other response validation constructs are supported.
- All validation must be expressed via `assertThat`.

### Reserved `$response` Namespace

At runtime, `httpCheck` provides a reserved `$response` namespace that can be used by `response.bind` JSONPaths.

`$response` exposes:

- `$response.status` -> HTTP status code (number)
- `$response.headers` -> response headers as a JSON object
- `$response.body` -> parsed JSON response body (object)

Example bindings:

```yaml
response:
  bind:
    responseCode: $response.status
    correlationId: $response.headers.x-correlation-id
    vendorDecision: $response.body.decision
```

---

## Assertions (`assertThat`)

Assertions evaluate bound properties using declarative comparison operators.

```yaml
assertThat:
  - property: riskScore
    operator: '<'
    value: 700
```

### String containment

To assert that a response-bound string *contains* a substring (or does *not* contain it), use:

- `contains`
- `notContains`

Example (VIN decode)

```yaml
response:
  bind:
    errorText: $response.body.ErrorText
assertThat:
  - property: errorText
    operator: contains
    value: VIN decoded clean
```

**Rules:**

- `property` must refer to a name declared in `response.bind`.
- Multiple assertions imply logical AND (all must pass).

---

## Guardrails (Enforced)

httpCheck enforces the following rules:

- One outbound call per validation
- No chaining or conditional execution
- No response-to-request feedback loops or dynamic request shaping
- No mutation of request data
- No dynamic expressions or scripting
- No passthrough of entire request or response objects

Violations result in contract validation failure, not runtime failure.

---

## Summary

httpCheck allows Apistry to assert external facts at validation time while preserving:

- Contract clarity
- Architectural boundaries
- Deterministic behavior
- Security and auditability

Used correctly, it enables powerful real-world validation without turning the API layer into a workflow engine.
