# Architecture & Runtime

This page describes how a Contract-as-a-Service (CaaS) platform fits into your broader system: the key components,
how they interact, and which responsibilities sit where.

At a high level, the CaaS runtime sits in the middle of:

- **Clients** (internal or external) that call HTTP APIs
- **Data stores** where your resources live
- An **event bus** used to publish change events
- **Business services** that consume those events and implement domain workflows
- Optional **external services** invoked via proxy/transform operations

## High-level architecture

You can visualize a typical setup like this:

- **Client** → **Gateway** → **CaaS runtime** → **Data store(s)**
- **CaaS runtime** → **Event bus** (for create/update/delete events)
- **Event handlers / business services** → **Event bus** (consume events, run workflows)
- **CaaS runtime** ↔ **External services** (for proxy/transform operations when configured in the contract)

In your docs, you may want to add a diagram under `docs/images/` that illustrates:

1. A client making an HTTP request
2. The gateway forwarding to the CaaS runtime
3. The runtime:
   - Validating the request
   - Interacting with the data store
   - Emitting a change event to the event bus
4. One or more business services reacting to that event

This mental model sets up the division of responsibilities between the **runtime** and the **contract**.

## Runtime responsibilities

The CaaS runtime is a **generic engine** that interprets contracts. Its job is to provide a consistent, production-grade
execution environment for any well-formed contract.

Key responsibilities include:

### 1. Parse and load the OpenAPI contract

- Load the OpenAPI document (and any extensions) at startup or on demand.
- Validate that the contract is structurally sound and compatible with the runtime’s capabilities.
- Build internal models for:
  - Resources and schemas
  - Operations (paths + verbs)
  - Extensions that affect behavior

### 2. Expose HTTP endpoints (CRUD)

Based on the contract, the runtime:

- Registers HTTP routes for each operation (GET/POST/PUT/PATCH/DELETE).
- Maps path parameters, query parameters, headers, and bodies to request models.
- Produces responses that match the contract’s response schemas.

From a consumer’s point of view, the API looks like any other HTTP service—what’s different is that the behavior is
driven by the contract rather than handwritten controllers.

### 3. Apply cross-cutting concerns

The runtime centralizes cross-cutting concerns so they are implemented once and reused across all APIs. Typical concerns
include:

- **Authentication & Authorization (AuthN/AuthZ)**
  - Validate tokens/credentials.
  - Enforce access control rules.

- **Logging, metrics, and tracing**
  - Structured request/response logging.
  - Latency and error metrics.
  - Distributed traces across gateway, runtime, and downstream services.

- **Rate limiting and throttling**
  - Per-API, per-consumer, or per-operation limits.

- **Error handling & validation**
  - Translate validation and runtime errors into consistent problem responses.
  - Ensure error shapes follow a standard contract (e.g., RFC 7807 problem details).

Because this logic lives in the runtime, any improvement here benefits **every** API that runs on CaaS.

### 4. Execute contract extensions

The runtime also understands **contract extensions** that influence behavior beyond standard OpenAPI semantics.
Examples include:

- **Soft deletes (`x-soft-delete`)**
  - Instead of physically deleting a record, the runtime updates a status field (e.g., `status: inactive`).
  - Query operations automatically filter out soft-deleted records, based on the contract’s configuration.

- **Validations (`x-validations`)**
  - Pre-processing checks that run before a write operation is committed.
  - Could reference built-in validation functions or pluggable custom ones.

- **Proxy/transform definitions**
  - Operations that fetch data from external services and transform it into the shape defined in the contract.
  - Useful for integrating legacy systems or third-party APIs without exposing their raw interfaces.

By keeping these behaviors declarative, the runtime allows teams to change behavior by **changing the contract**, not
by modifying service code.

## Contract responsibilities

The OpenAPI contract is more than documentation; it is the **specification the runtime executes**. Its responsibilities
include:

### 1. Schema definition and relationships

- Define resources and their properties.
- Capture relationships between resources (e.g., one-to-many, references).
- Express constraints such as required fields, enums, and format hints.

### 2. Operation definitions

- Describe each operation the API exposes (GET/POST/PUT/PATCH/DELETE).
- Specify:
  - Paths and HTTP verbs
  - Request parameters and body schemas
  - Response codes and payload schemas

These definitions tell the runtime **what** operations exist and **how** requests and responses should look.

### 3. Extensions for behavior

Standard OpenAPI can’t express all the runtime’s behavioral nuances, so you use **custom extensions** to fill the gap.
Common examples:

- `x-soft-delete` – how to treat DELETE operations as logical deletes.
- `x-validations` – which validation routines to run before writes.
- `x-change-events` (or similar) – which events to emit on create/update/delete.
- Projection or transformation hints for proxy/transform scenarios.

In a CaaS model, these extensions are not “nice to have” extras—they are **first-class configuration** that directly
shape runtime behavior.

## Separation of concerns

CaaS is effective when the boundary between **runtime**, **contract**, and **business logic** is clear.

- The **runtime** is:
  - Generic and reusable across many APIs and domains.
  - Focused on cross-cutting concerns, CRUD behavior, and event emission.
  - Versioned and operated like a platform component.

- The **contract** is:
  - Owned by product/architecture + domain teams.
  - The single source of truth for the API surface and runtime behavior.
  - Evolved carefully with governance and tooling (linting, review).

- **Business logic** primarily lives **outside** the runtime:
  - In event-driven services that react to change events.
  - In pre-processing validations, when they are generic enough to be shared.

This separation lets you:

- Improve cross-cutting concerns once in the runtime, for all APIs.
- Evolve domain logic independently in event-driven services.
- Keep contracts clean and explicit about how the API behaves.

As you design and implement your own CaaS platform, use this architecture as a guide: keep the runtime small and
focused, push as much behavior as possible into well-defined contracts, and let business services focus on what they do
best—implementing domain-specific workflows.
