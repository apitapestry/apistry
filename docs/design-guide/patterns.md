# Patterns

> Draft outline for expected content. Replace bullets with full content as you develop the docs.

## Overview
- What are CaaS patterns?
- When to use patterns vs ad-hoc solutions

## Core Runtime Patterns
- Request routing and operation dispatch
- Schema-driven validation and coercion
- Error handling and problem details

## Data Access Patterns
- CRUD-by-contract
- Soft delete handling
- Query filtering, paging, and sorting

## Extension Patterns
- Using OpenAPI extensions (x-*) to drive behavior
- Validation hooks (pre-processing)
- Change-event hooks (post-processing)

## Integration Patterns
- Proxy/transform operations
- Aggregation and composition across services
- Handling legacy and third-party APIs

## Security & Governance Patterns
- AuthN/AuthZ driven by contract
- Multi-tenant considerations
- Observability, logging, and auditing

## Anti-Patterns
- Where CaaS is a bad fit
- Common design mistakes and how to avoid them

## Examples
- 1–2 concrete pattern walkthroughs
- Links to sample contracts / repos (future)

## Proxy/transform pattern

In many systems, some resources are not stored locally but must be retrieved from **external or legacy services**. CaaS
supports this by allowing **proxy/transform operations** to be defined in the contract.

In this pattern:

- The contract declares that a given operation is implemented as a proxy call to another service.
- The runtime performs the outbound HTTP request (or other protocol call).
- Response data is **mapped into the local schema** defined in the contract.

This approach is particularly useful for:

- Integrating legacy systems that cannot be refactored immediately
- Wrapping third-party APIs in a stable, organization-specific model
- Gradually migrating from older architectures while keeping a consistent contract surface for consumers

Proxy/transform definitions keep transport details and data-shaping logic declarative and centralized, rather than
scattering integration code across many bespoke services.
