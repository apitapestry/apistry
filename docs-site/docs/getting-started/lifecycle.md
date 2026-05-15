# API Lifecycle
Apistry enforces a fixed service lifecycle. This lifecycle is not configurable, and that is intentional.

Every request processed by Apistry flows through the same stages:

1. Validation – requests are validated against the contract schema
2. Authentication / Authorization – credentials are verified, access control rules are enforced
3. Normalization – defaults, coercion, and canonicalization are applied
4. Orchestration Validations – optional business validation actions are executed
5. Orchestration Business Logic – optional business logic actions are executed
6. Persistence – data operations occur based on contract semantics
7. Response Formatting – responses are formatted according to contract
8. Response Validation – responses are validated before returning

This ordering is fixed. Business logic cannot bypass validation, and persistence cannot occur before normalization.

The lifecycle guarantees consistency and prevents entire classes of bugs common in ad-hoc service implementations.

## 1. Validation

**What happens:**

- Schema validation
- Required fields enforced
- Illegal fields dropped
- Types checked 

**Customization:**

- Provide well-defined OpenAPI contract
- No imperative code

**Rule:**

Invalid requests throw errors immediately; nothing else runs.

## 2. Authentication / Authorization

**Customization:**

- Configure auth policy, not logic (coarse-grained, e.g., OAuth2, API Key)
- Access control is enforced (fine-grained, customerId matches, etc.)
- See guide for more details

**Rule:**

- Transport-level authorization (coarse-grained access)
- User must be authorized for resource (fine-grained access)
- If this fails, nothing else runs.

## 3. Normalization

**Customization:**

- Provide well-defined OpenAPI contract (schema truth)
- Configure contract with normalization / transform rules (semantic alignment)
- See guide for more details

**What happens:**

- Defaults applied
- Allowed coercions performed
- Enums normalized
- Structure aligned to canonical schema

**Rule:**

From this point on, data is “system-truth,” not user-input.

## 4. Orchestration Validations
Optional custom business validation actions

**Customization:**

- Write business validation actions
- Add actions to contract orchestration flows
- No persistence
- No transport logic
- See guide for more details

**What happens:**

- Domain invariants checked
- Cross-field rules enforced

**Rule:**

- This stage decides whether an operation may proceed, not how it is executed.
- This answers “is this allowed?”

## 5. Orchestration Business Logic
Optional custom business logic actions

**Customization:**

- Write business logic focused orchestration actions
- Add actions to contract orchestration flows
- Assume validated, canonical input
- No schema checks, no routing logic
- See guide for more details

**What happens:**

- External services called
- Sequences executed
- Conditional flows handled

**Rule:**

- This answers “how do we make it happen?”
- This stage executes approved intent; it must not invent new rules.

## 6. Persistence

**Customization:**

- if custom actions are used, add persistence actions to orchestration flows
- otherwise, no customization

**What happens:**

- Data is written
- Queries executed, data is fetched

**Rule:**

Persistence reflects decisions already made.

## 7. Response Formatting

**Customization:**

- Define contract with appropriate response schemas
- Can choose to have wrapper object, a list, a single object, or response code only

**What happens:**

- Contract response is used to determine what is returned
- Status code selected

**Rule:**

Responses are shaped, not constructed.

## 8. Response Validation

**Customization:**

- None

**What happens:**

- Any properties in response, that are not in contract, are stripped
- If format is invalid, error is thrown
- Response is returned

**Rule:**

The system speaks; the developer is done.

## What Developers Actually Own in Apistry

**They write:**

- OpenAPI contracts
- Business validation actions (Stage 4)
- Orchestration actions (Stage 5)

**They configure:**

- Normalization rules
- Transform behavior
- Auth policy

**They never touch:**

- Routing
- Validation plumbing
- Persistence mechanics
- Response formatting
- Transport concerns

## The Real Win

Apistry isn’t just “doing things automatically.”

It’s enforcing a rule that most teams never write down:

Developers are responsible for meaning, not mechanics.

That’s why this lifecycle works—and why it scales without turning into a ball of conditionals and regret.