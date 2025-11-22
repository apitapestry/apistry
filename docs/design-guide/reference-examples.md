# Reference & Examples

This page brings together two things:

1. A **reference** for the custom extensions used by the CaaS runtime.
2. **Concrete examples** of small OpenAPI contracts that use those extensions.

Use it as the place to answer: _“What does `x-soft-delete` mean exactly, and how do I use it in a contract?”_

---

## Extension naming conventions

CaaS uses **OpenAPI extensions** (fields whose names begin with `x-`) to describe behavior that goes beyond standard
OpenAPI semantics.

General guidelines:

- All runtime-specific extensions **must** be prefixed with `x-`.
- Use a consistent, descriptive pattern, for example:
  - `x-soft-delete`
  - `x-validations`
  - `x-change-events`
  - `x-proxy`
  - `x-transform`
- Keep extension names **short but specific**. Avoid overloading a single extension with too many concerns.

Where extensions can appear:

- **Path / operation level**
  - For behavior tied to a specific operation (e.g., `POST /pets`, `DELETE /pets/{id}`).

- **Schema level**
  - For rules that apply wherever a schema is reused.

- **Property level**
  - For fine-grained hints about a particular field.

The sections below describe each extension in more detail.

---

## `x-soft-delete`

### Purpose

`x-soft-delete` describes how a DELETE operation should behave as a **logical delete** rather than a physical one.
Instead of removing the row/document, the runtime updates a field (e.g., `status`) with a configured value (e.g.,
`inactive`) and hides those records from normal queries.

### Where it can appear

- **Operation level** on a `delete` operation.

Example:

```yaml
paths:
  /pets/{petId}:
    delete:
      x-soft-delete:
        property: petStatus
        value: inactive
```

### Properties

`x-soft-delete` is an object with the following fields:

- `property` (string, required)
  - Name of the field on the resource schema that represents lifecycle state (e.g., `status`, `isDeleted`).

- `value` (string | number | boolean, required)
  - Value to set when a resource is soft-deleted.

### Runtime behavior

When the runtime sees `x-soft-delete` on a DELETE operation, it SHOULD:

1. Translate DELETE into an **update operation** on the underlying data store:
   - Set `property` to `value`.
2. Treat soft-deleted records as **filtered out** from normal GET/list queries by default.
3. Optionally emit a change event (e.g., `EntityDeleted` or `EntitySoftDeleted`) so downstream services can react.

Filtering rules (for GET) are typically configured globally in the runtime based on the `property` and `value`.

---

## `x-validations`

### Purpose

`x-validations` declares **pre-processing validation routines** that must run before a write operation is committed.
These validations extend schema-based validation with domain-level checks.

### Where it can appear

- **Operation level** (e.g., on `post`, `put`, `patch`).
- **Schema level** (to apply the same validations wherever the schema is used).

Example (operation level):

```yaml
paths:
  /pets:
    post:
      x-validations:
        - validateAddress
        - validateBirthDate
```

### Shape

`x-validations` is an array of **validation identifiers**:

```yaml
x-validations:
  - validateAddress
  - validateBirthDate
```

Each identifier MUST correspond to a known validation function in the runtime or one of its plugins.

### Runtime behavior

For each incoming request on an operation with `x-validations`:

1. The runtime performs standard schema validation (OpenAPI/JSON Schema).
2. If schema validation passes, the runtime executes each configured validation in order.
3. If any validation fails, the runtime:
   - Aborts the operation (does not persist changes).
   - Returns a structured error response (e.g., problem+json) with details.

Validation functions typically receive:

- The parsed request body and parameters.
- Relevant context (authenticated user, tenant, etc.).

They return:

- Success (no error), or
- A structured validation error the runtime can convert into a standardized response.

---

## Future extensions (conceptual)

These extensions are part of the conceptual model but may still be under design in your implementation.

### `x-proxy`

Describes operations whose implementation is a **proxy call to another HTTP service**.

Likely properties:

- `target.url` – upstream URL template.
- `target.method` – HTTP method to use.
- `mapping.request` – how to map inbound parameters/body to the upstream request.
- `mapping.response` – how to map the upstream response to the contract’s response schema.

### `x-transform`

Provides fine-grained rules for **transforming payloads** (e.g., renaming fields, changing types, shaping nested
structures). Often used in combination with `x-proxy` or for post-processing responses.

### `x-change-events`

Makes event emission explicit at the contract level.

Likely properties:

- `name` – logical event name (e.g., `PetCreated`).
- `topic` – event bus topic/stream.
- `payload` – schema or reference describing the event payload.

An example sketch might look like:

```yaml
paths:
  /pets:
    post:
      x-change-events:
        - name: PetCreated
          topic: pets
          payload:
            $ref: '#/components/schemas/PetCreatedEvent'
```

Your implementation can start simple (implicit events for all writes) and evolve into this more explicit model.

---

## Examples

This section outlines example contracts that demonstrate how the extensions fit together. You can keep these as separate
files under `docs/` (e.g., `examples.md`, `runtime-extensions.md`) or inline here.

### 1. Simple CRUD example (soft delete + validations)

Goal: show a small, end-to-end contract that:

- Defines a simple resource (`Pet`).
- Uses `x-soft-delete` on DELETE.
- Uses `x-validations` on POST.

Sketch:

- **Resource**: `Pet` with fields `id`, `name`, `petStatus`, `birthDate`.
- **Endpoints**:
  - `GET /pets` – list pets.
  - `POST /pets` – create a pet (with `x-validations`).
  - `DELETE /pets/{petId}` – soft-delete a pet (`x-soft-delete`).

You can flesh this out into a full OpenAPI document in a dedicated examples file.

### 2. Example with events

Goal: illustrate how operations can emit change events, even if the event model is still evolving.

Scenario:

- `POST /orders` creates an order.
- The runtime emits an `OrderCreated` event (via implicit rules or `x-change-events`).
- An external service (Order Workflow) subscribes to this event to start processing.

The contract would:

- Define the `Order` schema.
- Define `POST /orders` with any needed `x-validations`.
- Optionally include `x-change-events` to make event emission explicit.

### 3. Example with proxy/transform

Goal: show how CaaS can front a legacy or third-party service while presenting a clean contract.

Scenario:

- `GET /legacy-orders/{id}` proxies to `https://legacy.example.com/orders/{id}`.
- The legacy service returns a payload like:

  ```json
  {
    "legacyId": "123",
    "total": 100.0
  }
  ```

- Your contract defines a schema with fields `id` and `totalAmount`.

A conceptual `x-proxy` configuration might look like:

```yaml
paths:
  /legacy-orders/{id}:
    get:
      x-proxy:
        target:
          url: https://legacy.example.com/orders/{id}
          method: GET
        mapping:
          response:
            id: legacyId
            totalAmount: total
```

The runtime would:

- Call the upstream URL.
- Map `legacyId` → `id`, `total` → `totalAmount`.
- Return a response matching your contract’s schema.

---

As you refine your runtime and extension model, you can expand this page into:

- A full **extension reference** (one section per extension with examples, edge cases, and error behavior).
- A library of **complete example contracts** that teams can copy and adapt when designing new CaaS-friendly APIs.
