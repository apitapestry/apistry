---
id: index
title: Overview
slug: /
hide_table_of_contents: false
---

![Apistry](/images/3dApistry-darkblue.png)

<p style={{fontSize: '24px'}}>OpenAPI contracts → running services <strong>without</strong> writing code!</p>

---

Apistry is a runtime engine that uses OpenAPI 3.0 contracts to provide a fully functional REST service.
This is accomplished Without writing service-specific code — business logic is added only where explicitly needed via actions.
The contract is extended to have all the needed config to drive the service.

It is now possible to have a fully operational service up and running in minutes!

...because routing, validation, and persistence are derived directly from the contract.

This page shows the fastest way to get Apistry running. Detailed explanations live in Getting Started and Guides.

---

## Features

Contract-Driven Runtime

- OpenAPI 3.0 as the Source of Truth – Define your API once; Apistry generates routes, validation, and persistence automatically
- No Service Code by Default – No controllers, routers, or boilerplate to get a working service
- Swagger UI Included – Interactive documentation for every running endpoint

Validation & Normalization

- Automatic Request & Response Validation – Powered by AJV and JSON Schema
- Deterministic Canonicalization – Defaults, coercion, and enum normalization applied consistently
- Strict Contract Enforcement – Invalid requests never reach business logic

Data & Persistence

- Automatic Collection Creation – Databases and collections are created and validated from OpenAPI tags at startup
- NeDB (Built-in) – In-memory or filesystem-backed JSON document database for fast local development
- MongoDB Support (Licensed) – Production-ready adapter with MongoDB-style semantics
- JSON Document Model – Designed to work with any document-oriented database

Querying & Bulk Operations

- Rich Query Operators – eq, neq, gt, lt, gte, lte, isNull, isNotNull, and wildcard matching
- Bulk Inserts, Updates, and Deletes – Operate on multiple records efficiently
- List Responses with Metadata – Optional pagination and total-count information

Extensibility & Orchestration

- Orchestration Actions – Add custom business rules and workflows only where needed
- Built-in Actions – Includes `http.call`, `contract.normalize.response`, and other core actions
- Custom Actions (Licensed) – Write and register your own business rules and orchestration logic
- Explicit Lifecycle Stages – Business validation and orchestration are cleanly separated from system mechanics

Platform & Deployment

- Fastify-Based – High-performance, low-overhead Node.js runtime
- CLI-First Experience – Start and manage services in seconds
- AWS Lambda Ready – Serverless deployment support (coming soon)

Why This Matters

Apistry removes boilerplate and enforces a clear service lifecycle, so developers focus on business meaning, not infrastructure mechanics.

## What’s Next?

Now that you have a running service, you may want to explore:

- **Quick Start** – Get a working service up and running in minutes with your first OpenAPI contract
- **Service Lifecycle** – How Apistry enforces validation, normalization, orchestration, and persistence
- **Writing Orchestration Actions** – Adding business rules and workflows (licensed feature)
- **Contract Design Guidelines** – Designing APIs that work well with Apistry’s runtime
- **CLI Reference** – Full command-line options and flags

All documentation is available in the left navigation.

## Support

If you need help using Apistry or have any questions, you can use [GitHub Discussions](https://github.com/apitapestry/apistry/discussions)

If you have a bug or feature request, [create an issue for it](https://github.com/apitapestry/apistry/issues).

## License

Apistry includes an open-source core licensed under the
[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt).

The following capabilities require a paid commercial license:

- Production database adapters (including MongoDB)
- Authoring and registering custom orchestration actions

The built-in NeDB adapter and provided actions are available for local
development and evaluation.

See the documentation for details on licensing and feature availability.
