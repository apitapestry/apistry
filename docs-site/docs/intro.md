---
id: intro
title: Introduction
slug: /intro
---

# Introduction

If you’ve just followed the **Overview** page, you’ve already seen the fastest path to a running API.
This page is the “mental model” for the rest of the docs: what Apistry is, how to think about it, and where to go next.

## What is Apistry?

**Apistry is a contract-driven runtime that turns OpenAPI 3.0 documents into a working REST service.**
Instead of writing controllers, routers, and request/response validation by hand, you describe your API once in an OpenAPI contract and Apistry:

- generates routes from your `paths`
- validates and normalizes requests and responses
- maps tagged endpoints to collections for persistence
- exposes interactive docs (Swagger UI) when enabled

When you *do* need custom behavior, you add it intentionally via **actions** (orchestration hooks) rather than baking bespoke logic into every endpoint.

## The core mental model

A helpful way to think about Apistry is:

1. **The contract is the source of truth**
   - Your OpenAPI document is not just documentation. It drives runtime behavior.
2. **The runtime is predictable by default**
   - System concerns (routing, validation, normalization, persistence) are derived from the contract.
3. **Business logic is opt-in**
   - Use orchestration/actions only where you need rules, workflows, or integration calls.

This keeps services consistent across teams and reduces “drift” between code and API description.

## What you’ll see throughout the docs

As you read, the docs generally build from “what’s generated automatically” → “how to customize safely”:

- **Validation & normalization**
  - Requests are checked against JSON Schema (AJV) and normalized deterministically (defaults/coercion/enum normalization).
- **Service lifecycle stages**
  - Apistry separates system mechanics from business rules so it’s clear *when* validation runs, *when* orchestration runs, and *when* persistence happens.
- **Contract extensions (`x-…`)**
  - Apistry uses OpenAPI extensions to configure runtime behavior that OpenAPI doesn’t cover directly.
- **Querying and bulk operations**
  - List endpoints can support rich filtering and bulk changes in a consistent way.

## When should I use Apistry?

Apistry is a great fit when:

- you want to stand up internal services quickly from a contract
- you value consistent validation and predictable API behavior
- you’re building document-oriented REST APIs (CRUD + query)
- you want to keep custom code *limited to* the endpoints that truly need it

You may *not* want Apistry when:

- every endpoint requires deeply custom business logic
- you need a highly specialized persistence model that doesn’t map well to a document database
- you’d rather optimize for framework flexibility over contract enforcement

## Where to go next

Pick the path that matches what you’re doing next:

- **New to Apistry?** Start with the high-level flow:
  - **[Getting Started → Architecture](getting-started/architecture.md)**
  - **[Getting Started → Concepts](getting-started/concepts.md)**
  - **[Getting Started → Service Lifecycle](getting-started/lifecycle.md)**

- **Trying to run a service locally or in a sandbox?**
  - **[Getting Started → Start Server](getting-started/server-start.md)**
  - **[Getting Started → Database](getting-started/database.md)**

- **Designing contracts that behave well at runtime?**
  - **[Reference → OpenAPI Contract Rules](reference/openapi-design.md)**
  - **[Reference → Contract Extensions](reference/extensions.md)**
  - **[Guides → Schema Design Patterns](guides/schema-design.md)**

- **Need custom workflows or integrations?**
  - **[Guides → Actions & Orchestration](guides/actions.md)**

- **Looking up exact behavior/flags?**
  - **[Reference → CLI Reference](reference/apistry-cli.md)**
  - **[Reference → API Semantics](reference/api-semantics.md)**
  - **[Reference → Error Codes & Status Mapping](reference/error-codes-and-status-mapping.md)**

## A note on examples

The repo includes sample contracts under `/contracts` (Books, Cars, Notes, Swapi, Utils, Videos). They’re a good way to learn features in isolation.
As you read the docs, it can help to keep one of those contracts open and cross-reference how an OpenAPI definition maps to runtime behavior.
