# Problem & Motivation

The way most organizations build APIs today is powerful but expensive. Even with good tools and modern frameworks,
shipping and maintaining APIs still takes a lot more time, code, and coordination than it should.
Before introducing a new approach, it’s important to make the pain points clear.

## The current API development reality

Most teams follow one of two broad approaches to API development:

- **Code-first** – implement the API, then generate (Swagger-ui) or hand-write the contract after implementation is complete.
- **Contract-first** – design the contract (often using OpenAPI), then generate server/client stubs and fill in the logic.

Both approaches will work well technically, but in practice they share a core characteristic:
> They still produce large amounts of bespoke service code for each and every API.

Each new service tends to re-implement the same patterns:

- Endpoint wiring and routing
- Request/response validation
- Authentication and authorization
- Error handling
- Logging, metrics, and tracing
- Database access, pagination, and filtering

Over time, this leads to a sprawling landscape of services that are **similar but not quite the same**, with subtle
behavior differences hidden inside the code.

## Contract-first vs. code-first – same outcome: lots of code

Contract-first improves **design** and **alignment**, but it doesn’t fundamentally change the deployment model:

1. Design the contract
2. Generate stubs - coupling contract to implementation
3. Implement business and technical logic in code
4. Deploy and operate yet another service

Code-first flips the order—write code first, then produce the contract—but the end result is similar: another bespoke
service with its own implementation of cross-cutting concerns.

In both cases, the contract is mostly **descriptive** – it explains what the API is supposed to do, but it doesn’t _run_ 
the API. The heavy lifting still happens in handwritten code.

## Duplication of cross-cutting concerns

Because each service owns its own codebase, cross-cutting behaviors are often duplicated across many repositories:

- **Security** – auth, claims mapping, role checks, tenant scoping
- **Observability** – logging, metrics, tracing, correlation IDs
- **Error handling** – consistent problem responses, error codes, and retries
- **Data access** – pagination, filtering, sorting, soft deletes

Even with shared libraries and frameworks, this duplication has consequences:

- Small variations creep in from project to project
- Upgrades and fixes must be rolled out to many services
- New teams copy existing patterns, including old mistakes

The result is a platform where **consistency is aspirational**, but far from possible.

## The cost of code-heavy APIs

This duplication shows up as concrete cost in several dimensions.

### Long cycle time: idea → design → code → deploy

Even for a simple CRUD API, the journey often looks like:

1. Draft requirements and initial data model
2. Design the API (in a contract or in code)
3. Create a new service or extend an existing one
4. Implement endpoints, validation, and cross-cutting concerns
5. Write tests, wire up CI/CD, deploy to environments

Each step involves multiple roles — product, architecture, developers, operations — and multiple feedback loops.
The more services you have, the more of this you repeat.

### Maintenance & onboarding complexity

Once APIs are in production, teams must:

- Keep many services patched, secure, and up to date
- Onboard new developers to many different codebases and patterns
- Coordinate changes across contracts, implementations, and consumers

Refactoring becomes expensive. A simple change in how you handle, say, pagination or error responses might require
changes in dozens of services. Over time, teams accumulate **accidental complexity** that slows everything down.