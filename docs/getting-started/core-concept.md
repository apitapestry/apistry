# Core Concepts

This page crystallizes what **Contract-as-a-Service (CaaS)** is and how it differs from related approaches. You can
think of it as the “definition and mental model” for everything else in this guide.

## What if the contract _was_ the runtime?

Imagine a different model from traditional API development:

> If designed properly, an OpenAPI contract can contain all of the needed information to deploy a fully functional API
> without writing any service-specific code.

Instead of using the contract to **generate** code, what if you used it to **drive a runtime engine**?

- The contract defines resources, operations, schemas, and rules.
- A generic runtime reads the contract and exposes the API automatically.
- Cross-cutting concerns are implemented once in the runtime and applied consistently across the entire organization.

In this model, you still write code — but you write it **once** in the runtime, not separately for every API. The
contract becomes:

- The **design artifact** teams review and iterate on
- The **source of truth** for how the API behaves
- The **input** to a runtime that can execute that behavior directly

This is the core motivation behind **Contract-as-a-Service (CaaS)**:
move as much behavior as possible into a well-designed contract, and let a dedicated runtime handle execution.

The remaining pages will explore what CaaS is, how to design contracts for it, and patterns for rolling it out safely
to your organization.

## Formal definition

> **Contract-as-a-Service (CaaS)** is an architecture in which a generic runtime engine interprets an API contract
> (for example, an OpenAPI document) at runtime to expose a production-ready API, with most behavior specified
> declaratively in the contract.

Instead of generating service code from the contract, you run the contract directly. The runtime becomes the
“execution engine” for your API Service.

From this perspective:

- The **contract** is the primary product.
- The **runtime** is a reusable platform component.
- Individual APIs are created by publishing new contracts, not by writing new service implementations.

## How CaaS differs from contract-first

CaaS can feel similar to contract-first development, but the two make a different trade-off.

### Contract-first (traditional)

In a traditional **contract-first** approach:

1. You design an OpenAPI (or similar) contract.
2. You use that contract to **generate server stubs and/or client SDKs**.
3. You fill in the generated server code with application logic.
4. Over time, you maintain the contract **and** the generated/handwritten code.

The contract is an important design artifact, but the runtime behavior ultimately lives in many separate service
codebases.

### Contract-as-a-Service

In **CaaS**:

1. You design an OpenAPI contract.
2. A **generic runtime** reads that contract at runtime.
3. The runtime exposes the API directly—**no per-service controller code**.
4. You maintain the contract and a small set of reusable extension points (validations, event handlers, proxy
   mappings), not a unique codebase per service.

Summarized:

- **Contract-first:** generate code from the contract; you maintain the code.
- **CaaS:** runtime directly executes the contract; you maintain the contract plus minimal extension points.

This shift moves complexity out of dozens or hundreds of services and into a **single, well-engineered runtime**.

## Design principles

CaaS is guided by a few core principles.

### 1. Contract is the primary source of truth

The OpenAPI contract is not an afterthought or an implementation detail—it is the **source of truth** for:

- Resources and schemas
- Operations (paths + verbs)
- Validation rules and constraints
- Soft delete behavior
- Event emission
- Proxy/transform semantics

Teams discuss and review contracts as first-class artifacts. When behavior needs to change, they update the contract
and let the runtime pick-up the new intent.

### 2. Runtime is contract-agnostic

The CaaS runtime is:

- **Generic** – it doesn’t “know” about specific domains like pets, orders, or users.
- **Driven by contracts** – it only knows what to do because the OpenAPI document tells it.
- **Schema Validation** - ensures all requests and responses conform to the contract.
- **Reusable** – the same runtime can host many APIs across different teams and domains.

All domain-specific behavior is pushed into **contracts** and **extension points**, not hard coded into the runtime.

### 3. Business logic lives at the edges

Business logic is intentionally moved out of the per-endpoint controller code and into a small set of well-defined
places:

- **Pre-processing business validations**
  - Synchronous checks that must pass before a mutation is committed.
  - Declared in the contract (e.g., `x-validations`) and implemented as reusable functions.

- **Post-processing via events**
  - Asynchronous logic that reacts to changes after the fact.
  - The runtime emits change events (e.g., `UserCreated`, `OrderStatusChanged`); event-driven services implement
    workflows.

- **Proxy/transform logic**
  - Contract-defined mappings for operations that call external services.
  - The runtime handles the HTTP plumbing and transformation; mappings live in the contract.

By standardizing these extension points, you get a clean separation of concerns:

- The runtime focuses on CRUD, cross-cutting concerns, and event emission.
- Contracts declare behavior in a declarative, reviewable way.
- Business services focus on domain-specific workflows and integrations.

## Scope of CaaS

CaaS is powerful, but it’s intentionally scoped. It’s not trying to do everything an application platform might do.
Instead, it focuses on a specific slice of the stack.

### 1. CRUD-focused API surface

CaaS is optimized for APIs that can be modeled as:

- Creating resources (POST)
- Reading resources or collections (GET)
- Updating resources (PUT/PATCH)
- Deleting (actual or soft) resources (DELETE)

More complex behaviors are expressed as combinations of these operations plus events and external services, rather than
custom endpoints that mix transport, business logic, and side effects.

### 2. Cross-cutting concerns in the runtime

Cross-cutting concerns live in the runtime, not in individual services. Examples include:

- Authentication and authorization
- Logging, metrics, and tracing
- Error handling and problem details
- Pagination, filtering, and sorting
- Soft delete handling
- Database interactions

These are implemented **once** and reused across all contracts, which improves consistency and reduces maintenance.

### 3. Business workflows in event/processing services

Business workflows — things like sending notifications, updating aggregates, enforcing complex policies—run in **event-
driven or processing services** that sit next to the runtime, not inside it.

The pattern looks like this:

1. The contract defines resources, operations, validations, and events.
2. The runtime executes CRUD operations and emits change events.
3. Business services subscribe to those events and implement workflows.

This keeps the CaaS runtime small and focused while giving domain teams full power to build rich behavior on top of this 
framework.

---

If you remember nothing else, remember this mental model:

- **Contracts** describe what the API is and how it should behave and what model is being used.
- **CaaS** = contracts as executable specifications + a generic runtime.
- The **runtime** enforces that behavior consistently across all APIs.
- **Business logic** lives in validations, events, and external services—not in per-API controller code.

This is an architecture mindset shift that can unlock huge productivity and consistency gains across your API ecosystem.  
