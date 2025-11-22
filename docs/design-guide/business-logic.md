# Business Logic Patterns

In a Contract-as-a-Service (CaaS) model, the API layer is intentionally simple: a clean CRUD interface backed by a
runtime that executes an OpenAPI contract. The question most teams immediately ask is:

> “Where does my business logic go now?”

This page collects the most common “how do I do X?” questions into one place and shows how to express them using
contracts, the CaaS runtime, and event-driven services.

## GET operations: pure data retrieval

In CaaS, **GET operations should be as close to pure data retrieval as possible**.

### No domain logic in GET

For read operations, avoid embedding domain workflows or side effects. A GET should:

- Retrieve data from the appropriate store(s)
- Apply filters, pagination, and projections as specified in the contract
- Return a response that matches the defined schema

This makes reads:

- Predictable and cacheable
- Easy to reason about for consumers
- Independent of business workflows

If a read requires complex calculations or aggregations, consider:

- Materializing a **read model** via events (e.g., projections updated on write events)
- Exposing that read model as a resource via standard CRUD semantics

### Filters, pagination, projections

The contract should define:

- **Filterable fields** – which properties can be used in query parameters
- **Pagination strategy** – offset/limit, page/size, or cursor-based
- **Projections** – fields that can be included/excluded via query parameters (e.g., `fields=name,email`)

The runtime is responsible for:

- Validating query parameters
- Translating filters and pagination into data store queries
- Enforcing limits and defaults (e.g., max page size)

No custom code is needed per API; the runtime implements these patterns once and applies them consistently across
contracts.

## POST/PUT/PATCH: validations & state transitions

Write operations are where business rules usually show up. In CaaS, you split responsibilities between **pre-processing**
(synchronous, before the write) and **post-processing** (asynchronous, after the write via events).

### Pre-processing (synchronous, before write)

Pre-processing is for logic that must run **before** data is persisted and must influence whether the operation
succeeds.

Typical examples:

- **Input validation beyond schema**
  - Cross-field checks (e.g., start date < end date)
  - Referential checks against other resources (where feasible synchronously)

- **Simple defaults and normalization**
  - Filling in default values when not provided
  - Normalizing fields (e.g., trimming strings, lowercasing emails)

- **Guard checks**
  - Ensuring operations are allowed in the current state (e.g., cannot cancel a shipped order)

In a CaaS contract, you might model this with an extension such as:

```yaml
paths:
  /users:
    post:
      x-validations:
        - validateUniqueEmail
        - normalizeUserProfile
```

The runtime:

- Calls the configured validations before committing the change
- Rejects the request with a clear error if any validation fails

### Post-processing (asynchronous, via events)

Post-processing is for logic that **reacts to changes** but doesn’t need to block the original request.

Examples:

- Sending a welcome email on `UserCreated`
- Updating a search index on `ProductUpdated`
- Rebuilding aggregates or projections after a status change

In the CaaS model:

1. The runtime handles the write (POST/PUT/PATCH) and persists the change.
2. It emits a **change event** (e.g., `UserCreated`, `OrderStatusChanged`) to an event bus.
3. One or more **event-driven services** subscribe to these events and implement business workflows.

This pattern keeps the API surface simple and responsive, while allowing business logic to grow in separate, focused
services.

## DELETE: soft vs. hard delete

Delete operations deserve special attention. In many business domains, you want to **retain historical data** while
removing it from active use.

### Soft delete as the default

A common default in CaaS is **soft delete**:

- The record is not physically removed from the database.
- A flag or status field is updated instead (e.g., `status: inactive`, `isDeleted: true`).

The contract can express this with an extension such as:

```yaml
paths:
  /pets/{petId}:
    delete:
      x-soft-delete:
        property: status
        value: inactive
```

The runtime then:

- Updates the specified property instead of issuing a hard delete
- Ensures that GET/list operations exclude soft-deleted items by default

### Hard delete for exceptional cases

Hard deletes (physically removing data) may still be needed for:

- Test data
- Highly transient resources
- Compliance-driven deletion requirements

In those cases, you can either:

- Configure explicit **hard delete operations** in the contract, or
- Restrict hard delete to **administrative paths** with stricter authorization

The key is to make the semantics explicit in the contract so consumers and downstream services know what to expect.

### Event implications

Both soft and hard deletes can emit events:

- `EntityDeleted` with metadata indicating whether the deletion was soft or hard
- Downstream services can:
  - Remove items from search indexes
  - Revoke access rights
  - Trigger archival workflows

Again, the delete operation itself stays simple; the complexity lives in event listeners.

## Event-driven post-processing

A core CaaS principle is:

> The API becomes a simple CRUD interface; business logic lives in services that consume change events.

This leads to a set of reusable patterns.

### Example: send email on `UserCreated`

- Contract defines a `POST /users` operation.
- Runtime persists the new user and emits a `UserCreated` event.
- An **Email Service** subscribes to `UserCreated` and:
  - Applies any email-specific logic (templates, localization).
  - Sends the welcome email.

The user creation API doesn’t need to know how email works; it just publishes an event.

### Example: update search index on `ProductUpdated`

- Contract defines a `PATCH /products/{id}` operation.
- Runtime updates the product and emits `ProductUpdated`.
- A **Search Indexer** service consumes `ProductUpdated` and:
  - Projects the product into a search-optimized model.
  - Updates the search index.

Search concerns stay out of the main API path, improving response times and separation of concerns.

## Proxy/transform patterns

Sometimes, you need to **front existing systems** or **third-party APIs** while presenting a clean, domain-friendly
contract to your consumers. CaaS can support this via proxy/transform patterns.

### Contract-defined proxy/transform operations

In these scenarios, the contract defines operations whose **implementation is a proxy call** to an external service.
Extensions can describe:

- The upstream URL and method
- How to map request parameters and bodies
- How to transform the upstream response into the contract’s schema

For example:

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
            # Map legacy fields to new contract schema
            id: legacyId
            totalAmount: total
```

The runtime is responsible for:

- Calling the upstream service
- Handling errors and timeouts consistently
- Applying the configured mappings to produce the response defined in the contract

### Use cases

Proxy/transform patterns are particularly useful for:

- **Legacy system integration**
  - Introduce a modern API contract while still relying on legacy implementations.
  - Gradually migrate functionality behind the scenes without breaking consumers.

- **Third-party APIs**
  - Normalize different vendor APIs into a single, cohesive contract.
  - Hide vendor-specific quirks, authentication schemes, and error shapes from consumers.

In both cases, the contract remains the primary interface for consumers, while the runtime handles the complexity of
calling and adapting external services.

---

When in doubt, default to this rule of thumb:

- **Contracts** describe data shapes, operations, and high-level behaviors.
- The **runtime** enforces generic patterns (CRUD, validation, soft delete, proxy/transform, events).
- **Business logic** lives in event-driven services and reusable validations, not in per-endpoint controller code.

That separation keeps your APIs predictable, your runtime reusable, and your domain logic focused where it belongs.
