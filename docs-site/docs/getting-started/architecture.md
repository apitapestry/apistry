# A Reference Architecture for API Service Development

## Defining Service Responsibility and Execution Boundaries

This document describes an architectural model commonly referred to as Contract as a Service (CaaS), in which API
behavior is declared and enforced entirely through contracts.

---

## Abstract

Modern application frameworks provide developers with tremendous flexibility when building API services. While this
flexibility accelerates delivery, it also removes architectural guardrails. In the absence of explicit boundaries,
developers are free to embed arbitrary business logic into API services—often without realizing they are making
foundational architectural decisions.

This document defines a reference architecture for API service development that introduces clear responsibility and
execution boundaries. The architecture deliberately constrains what an API service is allowed to do, making persistence
simple and deterministic, and formalizing how business validation is expressed and enforced.

This is not an attempt to eliminate business logic or system complexity. It is an effort to **locate complexity where it
can be expressed safely, consistently, and reused effectively**.

Here is the architecture we are about to explain.

![architecture.svg](/assets/architecture.svg)

---

## The Problem: Flexibility Without Architectural Guardrails

Most modern API services are built on mature frameworks that handle large portions of the request lifecycle
automatically—security, routing, schema validation, error handling, and serialization.

As a result, architects and developers tend to focus only on what remains after framework concerns are addressed.

At that point, the framework offers few meaningful constraints.

From the developer’s perspective, all of the following feel equally valid:

- Applying business rules
- Deriving values
- Calling other services
- Writing to the database
- Triggering downstream behavior

They are all expressed as method calls.

Without explicit architectural boundaries, API services naturally evolve into execution engines that mix persistence,
business validation, interpretation, and side effects within a single request lifecycle.

The result is not intentional architecture—it is **accidental architecture**.

---

## Where Architecture Actually Begins

![architecture-begins.svg](/assets/architecture-begins.svg)

In practice, architectural decisions begin only after framework-managed concerns are complete.

From this point forward, developers must implicitly decide:

- What logic determines whether data may be written
- What logic belongs in the API versus elsewhere
- What failures are client errors versus system errors
- What behavior is part of the API contract

These decisions are rarely documented or standardized. They are made incrementally, under delivery pressure, and often
differ across teams and services.

Over time, this produces systems with:

- Inconsistent designs
- Tightly coupled APIs
- Duplicated validation logic
- High maintenance and evolution costs

---

## The Reference Architecture: Constraining API Responsibility

This reference architecture introduces a deliberate constraint:

> **The API service determines whether a fact may exist and how it is recorded.  
> It does not interpret the meaning of that fact or coordinate behavior because of it.**

The goal is not to reduce flexibility, but to **focus it**—and to make architectural intent explicit rather than
implicit.

---

## API Service Responsibilities

Within this architecture, API services have a narrow and well-defined role.

### Allowed Responsibilities

An API service is responsible for:

- Enforcing authentication and authorization
- Validating request structure and data types against the API contract
- Evaluating **semantic business validation constraints** required before persistence
- Ensuring referential integrity, including validating references against external systems when required
- Applying deterministic, local derivations required to store a complete record  
  (e.g. identifiers, timestamps, normalizations, simple composites)
- Enforcing data consistency and integrity rules
- Persisting documents as durable facts

These actions are bounded, deterministic, and produce no externally observable behavior beyond persistence.

### Explicitly Excluded Responsibilities

An API service must not:

- Interpret business meaning
- Execute workflows or lifecycle logic
- Perform enrichment based on business interpretation
- Trigger notifications or integrations
- Coordinate downstream behavior
- Encode domain processes beyond write admission

If logic is not required to determine whether a record may be safely and correctly stored, it does not belong in the API
service.

![architecture-boundary.svg](/assets/architecture-boundary.svg)
---

## Semantic Business Validation Constraints

Most validation logic is structural and can be expressed directly in the API schema (types, formats, patterns, and
required fields). However, a small but critical class of business validation cannot be expressed declaratively.

![architecture-runtime-enforces.svg](/assets/architecture-runtime-enforces.svg)

Examples include:

- Age or eligibility checks derived from multiple fields
- Cross-field constraints (e.g. mutually exclusive properties)
- Temporal rules (e.g. dates relative to “now”)
- Conditional requirements
- External reference validation (read-only)

These validations are **semantic** rather than structural.

In this architecture:

- Semantic business validations are **declared in the API contract** as extensions on a property or object
- The contract references reusable validation functions from a function library
- The runtime interprets the contract and invokes the referenced validations
- Validations are deterministic, side-effect free, and evaluated before persistence

Failures of semantic business validations represent invalid client input and result in **422 Unprocessable Entity**
responses. Infrastructure or dependency failures during validation are treated as system errors.

This approach makes business validation explicit, reusable, and visible at the contract level—without embedding ad hoc
logic into API implementations.

| Validation Category          | Declared In        | Implemented By      | Purpose                                                  | Failure   |
|------------------------------|--------------------|---------------------|----------------------------------------------------------|-----------|
| Schema Validation            | OpenAPI Schema     | Runtime / Framework | Structural correctness (types, formats, required fields) | 400       |
| Semantic Business Validation | Contract Extension | Function Library    | Determine whether a record may be persisted              | 422       |
| Data Integrity Rules         | Database           | Persistence Engine  | Prevent invalid or inconsistent stored data              | 409 / 500 |

> **Example: Semantic Business Validation**
>
> A `Person` resource includes:
> - `birthDate`
> - `zip`
> - `city`
> - `state`
>
> The API contract declares:
> - A validation that the person is at least 18 years old
> - A validation that the ZIP code matches the provided city and state
>
> These validations are:
> - Evaluated before persistence
> - Implemented as reusable functions
> - Side-effect free
>
> Validation failure results in **422 Unprocessable Entity**.  
> External lookup failure results in a **5xx system error**.

---

## Persistence as the Execution Boundary

Persistence represents the end of API service responsibility.

Once a record is persisted:

- The API service has completed its role
- No additional execution occurs within the request
- No business interpretation is applied inline

Persistence is not a workflow step.  
It is the architectural boundary.

---

## Contract as a Service (CaaS)

This architectural model is referred to as **Contract as a Service (CaaS)**.

In CaaS, the API contract is not documentation and not a scaffold for code generation.
It is the executable declaration of service behavior.

A single, generic runtime interprets contracts at runtime and enforces:

* schema validation
* semantic business validation
* deterministic persistence

The service implementation remains intentionally ignorant of business domain and workflow semantics. All domain
specificity is expressed in the contract.

CaaS is not a deployment model or a tooling preference.
It is the consequence of treating persistence as the execution boundary and making contracts responsible for declaring
all admissible behavior.

---

## Making Persistence Simple and Boring

A central objective of this architecture is to make persistence simple, predictable, and intentionally uninteresting.

When the responsibilities of an API service are narrowly constrained—schema enforcement, semantic business validation,
and deterministic persistence—the resulting behavior becomes highly repeatable. This repeatability enables the creation
of a runtime or framework that can be reused across many APIs with minimal variation.

![architecture-reuse.svg](/assets/architecture-reuse.svg)

In this model:

- The runtime handles persistence uniformly.
- Validation behavior is declared in contracts, not reimplemented in code.
- API services no longer encode bespoke execution paths.

As a result, adding a new API becomes primarily a matter of introducing a new, opinionated contract rather than building
a new service. The cost of introducing new APIs drops dramatically, because the underlying runtime and persistence
behavior remain unchanged.

This shifts development effort away from rebuilding infrastructure concerns and toward true business differentiation.
Business functionality is expressed outside the API service boundary, where it can evolve independently without
impacting persistence or API correctness.

By making persistence boring, the system becomes highly reusable.
By making reuse the default, capability becomes low cost.

This is not a limitation—it is the mechanism by which the architecture scales.

---

## Scope and Intent

This reference architecture focuses exclusively on API service boundaries, responsibilities, and write admission.

Downstream processing, workflows, and event-driven behavior are intentionally out of scope for this document. They are
valuable concerns, but they do not alter the architectural responsibility of the API service itself.

The intent is to define a stable, repeatable model for API services that enables reuse, lowers maintenance costs, and
forces architectural clarity by default.

> **Out of Scope**
>
> This reference architecture does not attempt to define:
> - Workflow engines
> - Event processing frameworks
> - Saga coordination
> - Messaging guarantees
> - Deployment or infrastructure topology

---

## Architectural Applicability

While this reference architecture is implemented directly by Apistry, the principles and boundaries it defines are not
runtime-specific.

In the near future, these same boundaries will be enforced within a Spring Boot–based implementation. In that context,
the goal is not to replace Spring’s programming model, but to constrain it—making architectural intent explicit and
preventing accidental coupling between validation, persistence, and execution.

This reinforces a key premise of this architecture:

> Frameworks provide capability; architectures define responsibility.

---

## Summary

Frameworks excel at removing boilerplate, but they do not define architecture.

Without explicit guardrails, API services become execution engines by accident rather than design.

This reference architecture defines clear responsibility and execution boundaries, formalizes semantic business
validation, and makes persistence deterministic and boring.

The result is not less flexibility—but **better focus**.
