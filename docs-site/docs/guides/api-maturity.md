# API Maturity Model

This maturity model describes how responsibility for API behavior shifts over time—from ad-hoc code, to
explicit contracts, to contracts as executable systems.

The levels are cumulative. Each level addresses limitations of the previous one but introduces new
expectations of discipline and tooling.

This model provides context for where Contract as a Service fits—and why it represents a qualitative shift rather than an incremental improvement.

### Level 1: Code-First API

![api-execution-maturity1.svg](/assets/api-execution-maturity1.svg)

At this level, APIs are implemented directly in code. Design may exist informally—perhaps as a document, a
whiteboard discussion—but the implementation is the only true source of truth.

The API is typically viewed by developers as a collection of methods rather than a coherent interface. REST
principles, if considered at all, are inconsistently applied. As a result, APIs at this level tend toward what
Richardson describes as the Swamp of POX.

Documentation, when present, often diverges from actual behavior. Design drift is common, especially as services
evolve under delivery pressure. Consumers must rely on trial-and-error or source code inspection to understand
real behavior.

Each new API is built largely from scratch. Some shared libraries may exist, but core concerns—validation,
persistence, security, error handling—are repeatedly reimplemented.

#### Characteristics

- Implementation is the source of truth

- Contracts are optional and frequently inaccurate

- High development and maintenance cost

- Limited scalability at the organizational level

### Level 2: Contract-First API
![api-execution-maturity2.svg](/assets/api-execution-maturity2.svg)

At this level, the API contract is defined before implementation, typically using an OpenAPI specification. Code
generation is often used to scaffold service implementations, and governance may review designs prior to
development.

The contract and the code are expected to remain aligned. This alone represents a meaningful improvement:
consumers can trust the contract, and teams have a shared understanding of expected behavior.

However, the contract is still not executable. It describes what the API should look like, not how it behaves at
runtime. Each service remains a bespoke implementation, even if generated from common templates or frameworks.

Code generation reduces some effort but primarily serves as a consistency mechanism rather than a true
abstraction of behavior.

#### Characteristics

- Contract precedes implementation

- Contract and code are usually aligned

- Each API is still a distinct service

- Moderate reduction in development cost, limited reduction in operational complexity

### Level 3: Contract as a Service (CaaS)
![api-execution-maturity3.svg](/assets/api-execution-maturity3.svg)

At this level, the contract becomes the primary—and executable—service declaration.

The API contract does not describe behavior to be implemented later—it is the behavior. A single, generic
runtime interprets the contract and exposes a fully functional API. Proper REST design is mandatory, not
optional, because the contract must scale operationally as well as conceptually.

Once the platform exists, creating additional APIs is largely a matter of authoring new contracts. From a
development and maintenance perspective, the cost of going from one API to many approaches zero.

This model enables a clean segregation of duties:

Architecture (small platform team)
Owns and evolves the single service implementation. Ensures the runtime reflects organizational needs and
standards.

API Governance (cross-functional team)
Owns API design quality. Ensures contracts are RESTful, scalable, and compliant with organizational conventions.

Developers (platform contributors)
Create reusable orchestration actions that extend the contract’s expressive power without fragmenting the
runtime.

Developers (business services)
Build post-persistence, event-driven services that encapsulate business logic without polluting the API layer.

Here, scalability is no longer constrained by the number of services, but by the quality of the contracts and the
maturity of the platform.

#### Characteristics

- Contract is the source of truth and the runtime declaration

- One service, many APIs

- Strong separation of concerns

- Lowest marginal cost per additional API

## Why this works

The key shift across levels is where behavior lives:

- Level 1: Behavior lives in handwritten service code

- Level 2: Behavior lives in service code, guided by a contract

- Level 3: Behavior lives in the contract itself

This is the same kind of conceptual jump Richardson made when he reframed “REST maturity” as a progression of
constraints, not features.
