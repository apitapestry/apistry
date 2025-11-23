# Concepts

Apistry is an implementation of the [Contract as a Service (CaaS)](https://www.contract-as-a-service.net) architecture pattern. It's an
OpenAPI-driven REST API service that automatically generates fully operational API endpoints directly from OpenAPI 3.0
specifications. Code is NOT generated from the contract; instead, Apistry interprets the contract at runtime to handle
requests, perform data operations, and enforce validation.

## What is Apistry?

Apistry is a **runtime engine** that reads OpenAPI contracts and turns them into working APIs without writing
service-specific code. Built on Node.js and the Fastify framework, it provides:

- **Contract-driven execution** - Deploy APIs by publishing contracts, not writing code
- **MongoDB integration** - Built-in CRUD operations with advanced query capabilities
- **Auto-validation** - Automatic request/response validation using the contract schemas
- **High performance** - Built on the Fastify framework
- **Production ready** - Includes monitoring, error handling and logging

## Openapi Design Requirements

In order for Apistry to function properly, there are some design requirements that must be followed.
See: [OpenAPI Design Requirements](openapi-design.md)

## Use Cases

Apistry is ideal for:

- **Rapid API Development** - Go from concept to working API in minutes
- **CRUD-Heavy Applications** - Data management applications with standard create/read/update/delete patterns
- **Prototyping** - Quickly validate API designs before investing in custom implementation
- **Internal APIs** - Backend services for internal tools and dashboards
- **Event-Driven Architectures** - Simple CRUD surface with business logic in event consumers
<br><br>