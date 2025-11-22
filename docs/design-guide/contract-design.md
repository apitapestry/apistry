# Contract Design

Designing good contracts is the most important part of a Contract-as-a-Service (CaaS) platform. The runtime can only
behave correctly if the OpenAPI document gives it enough **structure** and **behavioral hints** to work with.

This page shows how to design contracts that are:

- Friendly to a CaaS runtime
- Clear for humans to read and review
- Explicit about CRUD semantics, validations, and events

## CaaS-friendly OpenAPI basics

In CaaS, the OpenAPI contract is not just documentation or a stub-generation source. It is **the specification the
runtime executes**.

That means a few OpenAPI basics matter more than usual:

### Paths, operations, and schemas

At a minimum, each contract should clearly define:

- **Paths and operations**
  - Use conventional REST-style paths (e.g., `/pets`, `/pets/{petId}`).
  - Use standard HTTP verbs (GET/POST/PUT/PATCH/DELETE) with well-defined semantics.

- **Schemas**
  - Use `components.schemas` to define reusable models.
  - Capture constraints (required fields, enums, formats) so the runtime can perform rich validation.

### Limit complex imperative logic in the API layer

The contract should **not** try to describe complex imperative workflows or deep domain logic inside the API layer.
Instead:

- Treat the API as a **CRUD + events** surface.
- Use OpenAPI + extensions to describe:
  - Data shapes
  - Allowed operations
  - Simple validations and state rules
  - Events emitted on change

Everything more complex should live in **event-driven services** that subscribe to those events. This keeps contracts
readable and makes the runtime’s job clear.

## Modeling CRUD operations

CaaS assumes a **CRUD-first** view of the world: create, read, update, and delete operations over well-defined
resources.

High-level guidelines:

- **GET** – no business logic, just retrieval + filters.
- **POST/PUT/PATCH** – primarily data changes + simple validations.
- **DELETE** – usually implemented as soft delete via an extension.

### GET: retrieval and filters only

GET operations should:

- Return data in the shape defined by the response schemas.
- Support filtering, pagination, and projections where needed.
- Avoid performing complex domain workflows or side effects.

Complex read requirements can be handled by:

- Projections or read models updated asynchronously via events.
- Specialized resources that expose aggregated or computed views.

### POST/PUT/PATCH: data changes + simple validations

Write operations should:

- Focus on changing resource state (create, replace, partial update).
- Express business **rules** via validations and state constraints, not ad-hoc controller code.

The contract should:

- Define clear request schemas for each write operation.
- Use extensions to attach **pre-processing validations** (see below).

### DELETE: usually soft delete via extension

In many domains, you don’t want to physically remove data. Instead, you mark it as inactive and hide it from active
queries. CaaS supports this pattern naturally via a **soft delete** extension.

## Soft delete pattern

Consider this simple example:

```yaml
paths:
  /pets/{petId}:
    delete:
      x-soft-delete:
        property: petStatus
        value: inactive
```

This tells the runtime:

- `x-soft-delete.property: petStatus`
  - The field on the resource that represents its lifecycle status.
  - When a DELETE is issued, the runtime should **update this field** rather than physically deleting the record.

- `x-soft-delete.value: inactive`
  - The value to set when the resource is logically deleted.
  - After deletion, `petStatus` will be `inactive`.

A CaaS-aware runtime can then:

1. Translate `DELETE /pets/{petId}` into an **update operation** on the underlying data store.
2. Ensure that standard GET/list operations **exclude inactive records by default**, based on the same `x-soft-delete`
   configuration.
3. Optionally emit a `PetDeleted` (or `PetStatusChanged`) event so downstream services can react.

The contract makes soft delete behavior explicit and consistent across services.

## Pre-processing validations

Some rules must be checked **before** a write operation is committed. CaaS handles this via pre-processing validations
attached to operations or schemas using extensions like `x-validations`.

Reusing the example from the introduction:

```yaml
paths:
  /pets:
    post:
      x-validations:
        - validateAddress
        - validateBirthDate
```

This means:

- Before creating a new pet, the runtime should run two validation routines:
  - `validateAddress`
  - `validateBirthDate`

If any validation fails, the runtime:

- Rejects the request.
- Returns a clear, consistent error response (e.g., an RFC 7807 problem details object) describing why it failed.

### Where validations can be defined

Depending on your design, validations can be attached at different levels:

- **Operation level** (as in the example above)
  - Applies only to that specific operation (e.g., `POST /pets`).

- **Schema level**
  - Attach validations to a schema in `components.schemas`, so any operation using that schema gets the same rules.

- **Property level**
  - For fine-grained checks, use property-level metadata or patterns that the runtime understands.

The exact shape of these extensions is up to your implementation, but the principle is the same: the contract declares
which validations should run; the runtime executes them.

### Mapping names to validation functions

Validation names (e.g., `validateAddress`) must map to **actual validation functions** available to the runtime.
Common strategies include:

- A **registry** inside the runtime that maps names to functions.
- A configuration file or plugin mechanism that registers additional validations.

The contract stays decoupled from implementation details, but there is a clear, stable contract between:

- The **names** used in `x-validations`.
- The **functions** the runtime knows how to call.

### Expected behavior on validation failure

When a validation fails, the runtime should:

- **Not** commit any data changes.
- Return a structured error response that includes:
  - A machine-readable error code (e.g., `validation_failed`).
  - A human-readable message.
  - Optionally, a list of field-specific issues.

By standardizing validation error behavior in the runtime, all APIs built on CaaS will behave consistently.

## Post-processing via events

Many business workflows do **not** need to run inside the request/response path. Instead, they can run asynchronously
in response to change events.

In a CaaS model, write operations typically:

1. Validate the request.
2. Apply the change (create/update/delete/soft delete).
3. Emit one or more **change events**.

### Contract-side event configuration

You can start simple, with a generic event emission model where the runtime automatically emits events for changes:

- `EntityCreated`
- `EntityUpdated`
- `EntityDeleted` (or `EntitySoftDeleted`)

Over time, you may want more explicit configuration via extensions such as:

```yaml
paths:
  /pets:
    post:
      x-change-events:
        - name: PetCreated
          topic: pets
```

This would tell the runtime:

- After a successful `POST /pets`, emit a `PetCreated` event
- Publish it to the `pets` topic/stream on your chosen event bus

The **exact** shape of `x-change-events` is implementation-specific, but the idea is the same: the contract declares
that certain operations produce events, and the runtime is responsible for emitting them.

### Business workflows listen on events

With events in place, business logic moves out of the API layer:

- **Notification services** listen for events like `PetCreated` and send emails or push notifications.
- **Analytics and reporting services** listen to streams of change events to build aggregates and dashboards.
- **Downstream systems** subscribe to events to stay in sync without tight coupling.

The CaaS runtime stays focused on CRUD, validation, and event emission. The contract tells it **what** to do; other
services implement **how** to react.

---

When designing contracts for CaaS, aim for:

- Clear CRUD semantics
- Declarative extensions for soft delete, validations, and events
- Minimal imperative logic in the API layer

If the contract is precise and expressive, the runtime can do most of the heavy lifting, and your teams can focus on
business logic in the right place: services that react to the events your contracts describe.
