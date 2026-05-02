# Concepts: Designing for a Contract-Executed Architecture

Apistry implements a constrained API architecture where **contracts declare behavior and persistence marks the execution
boundary**.  
This page explains how to think and design *within* that model.

If you have read the Architecture section, you already understand what an API service is allowed to do.  
The concepts below describe how that responsibility is expressed in practice through contracts, and how to avoid
patterns that violate the boundary.

---

## Contracts Are Executable Declarations

In Apistry, an OpenAPI contract is not documentation and not a scaffold for generated code.

It is an **executable declaration of API behavior**.

At runtime, Apistry interprets the contract directly to determine:

- routes and HTTP methods
- request and response schemas
- required and optional fields
- validation rules
- normalization and coercion
- persistence behavior
- query, filter, and pagination semantics

There is no separate implementation layer that mirrors the contract.  
Behavior exists only once — in the contract itself.

This eliminates schema drift, reduces ambiguity, and ensures that documentation and runtime behavior are always aligned.

---

## What Belongs in the Contract

A contract defines the complete shape and behavior of an API.

It declares **what operations exist**, **how they are invoked**, **what data they accept and return**, and **under what conditions state may be persisted**.

The contract is not advisory. It is exhaustive.

Specifically, a contract declares:

### API Surface and Path Semantics

The contract defines the externally visible shape of the API, including:

- available paths and resource structure
- supported HTTP methods for each path
- operation intent (e.g. create, update, read, delete)
- path and query parameters and their meaning
- which interactions are valid and which are not

If an operation is not declared in the contract, it does not exist.

### Request and Response Models

For each operation, the contract defines:

- request body structure and required fields
- response schemas and status codes
- read-only and write-only properties
- field-level constraints and formats

These schemas define both the **write model** (what may be accepted) and the **read model** (what may be returned).
Any data not defined in the contract is ignored or dropped.

### Validation Rules

The contract declares all validation required for safe persistence, including:

- **Structural validation**
    - types, formats, required fields
    - allowed values and patterns

- **Semantic validation**
    - cross-field constraints
    - derived eligibility rules
    - referential integrity checks (read-only)

Validation determines whether a request represents a valid fact that may be persisted.

### Normalization and Defaults

The contract may also declare:

- server-owned or system-managed fields
- default values
- canonical representations and coercion rules

These ensure that persisted data conforms to a consistent, contract-defined model.

### Persistence Intent

Finally, the contract declares persistence semantics:

- which operations create, update, or delete durable records
- how identifiers are assigned and used
- how stored state is projected back to clients on read

Persistence is not implicit. It is defined by the contract.

---

If a rule, shape, or operation is required to determine **whether data may be stored** or **how stored data is represented**, it belongs in the contract.

If it is not required to allow the write or read projection, it does not belong in the API service.

---

## Runtime Interpretation (Not Code Generation)

Apistry does not generate controllers, routers, or data access layers.

Instead, the runtime:

- loads OpenAPI contracts at startup
- interprets operations and schemas dynamically
- enforces validation and normalization uniformly
- performs deterministic persistence

This approach intentionally trades flexibility for predictability.

By constraining behavior to what can be declared, Apistry ensures that APIs behave consistently across services,
environments, and teams.

---

## What Apistry Is Not

Apistry deliberately does **not** attempt to be:

- a general-purpose web framework
- a workflow or orchestration engine
- a domain behavior engine
- a platform for arbitrary control-flow logic
- an event processing system

Apistry is designed for APIs where:

- the contract owns the data model
- persistence represents durable truth
- correctness matters more than flexibility
- boilerplate is a cost, not a feature

When these assumptions hold, Apistry dramatically reduces effort and complexity.  
When they do not, a traditional framework may be more appropriate.

---

## Validation Constraints

Within Apistry, **validation constraints are the only supported mechanism for extending API behavior**.

Validation exists solely to determine whether a request represents a fact that may be safely persisted.  
It does not interpret business meaning, orchestrate workflows, or trigger side effects.

All validation is declared in the contract and evaluated before persistence.  
If logic is required for write admission, it belongs in a validation constraint.  
If it is not required to decide whether data may exist, it does not belong in the API service.

This constraint is deliberate. It preserves determinism, keeps request lifecycles bounded, and ensures that contracts
remain authoritative.

Validation constraints are described in detail in the **Validation Constraints** section.

## Persistence Ends Responsibility

Apistry’s responsibility ends at persistence.

Once a record is written:

- the request lifecycle is complete
- no additional execution occurs
- no business interpretation is applied inline

Post-persistence behavior — workflows, notifications, integrations, compensating actions — belongs in downstream systems
that react to stored state.

This separation is deliberate.

By ending responsibility at persistence:

- APIs remain deterministic and fast
- request lifecycles stay bounded
- retries and replays are safe
- business workflows evolve independently

Apistry commits durable facts.  
Other systems interpret and act on them.

---

## Designing Effectively with Apistry

Designing with Apistry means treating the API as the formal declaration of behavior and schema — defining what
may be persisted and how it is represented.

Effective contracts are designed around a single question:

> Can this request be safely and correctly persisted?

This leads to a different design approach:

- Model **admissible state**, not process or outcome
- Express **constraints on data**, not sequences of actions
- Use validation to decide whether a write is allowed
- Treat persistence as the end of API responsibility, not one step in a workflow

When contracts are designed this way, API behavior becomes deterministic and repeatable.  
Persistence becomes boring — and that is intentional.

Business interpretation, workflows, and side effects occur only after state is committed, in systems designed for that
purpose.

This separation keeps APIs stable over time while allowing business behavior to evolve independently.

Boring persistence scales.  
Predictable behavior survives change.  
Contracts become durable architectural assets rather than disposable documentation.
