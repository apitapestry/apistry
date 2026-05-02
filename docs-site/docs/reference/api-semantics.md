# API Semantics

This document defines **absolute runtime rules** enforced by Apistry.
These rules are testable, non-negotiable, and apply uniformly.

---

## Resources

- Resource names, IDs, and schema names are equivalent
- Resource identifiers are immutable
- Providing a resource ID forbids all other filters
- Bulk mutation requires explicit filters

---

## Resource Name, Resource ID, and Schema Name Equivalence (Hard Requirement)

For every resource, the following three identifiers **MUST be equivalent**:

1. **Resource path name** (plural)
2. **Primary key field name** (singular + `Id`)
3. **Schema object name** (singular)

These three form a single, intentional identity.

---

### Required Mapping

| Resource Path | Schema Name | Primary Key |
|---------------|-------------|-------------|
| `/cars` | `Car` | `carId` |
| `/orders` | `Order` | `orderId` |
| `/users` | `User` | `userId` |

All three **MUST align**.

---

### Enforcement Rules

- The schema name **MUST** be the singular form of the resource
- The primary key **MUST** follow `<schemaName>Id`
- The resource path **MUST** be the plural form of the schema name
- Alternative schema names are **NOT allowed**

Examples of **invalid schema naming**:
- `CarDTO`
- `CarInfo`
- `CarMetadata`
- `Vehicle`
- `MyCar`

These names introduce ambiguity and are rejected.

---

### Design Rationale

This constraint exists to:

- eliminate naming ambiguity
- prevent accidental schema drift
- ensure routing, persistence, and validation align
- avoid leaking internal modeling concepts into public APIs
- keep contracts readable, predictable, and tool-friendly

The schema name is **not an implementation detail**.
It is a public, canonical identity.

---

### Summary

- `/cars` ⇒ `Car` ⇒ `carId`
- Naming is intentional and enforced
- Identity is singular, not layered
- DTO-style naming is explicitly prohibited

## Resource Identity & Primary Key Rules (Strict)

Every resource **MUST have exactly one primary key**, referred to as the
**resource ID**.

### Cardinality

- A resource **MUST have one and only one** primary key
- Composite primary keys are **NOT supported**
- Additional unique fields **do NOT** constitute primary keys

---

### Naming Convention (Mandatory)

The primary key field name **MUST** follow this pattern:

```
<resourceNameSingular>Id
```

Examples:
- `/cars` → `carId`
- `/orders` → `orderId`

Any deviation is invalid.

---

### Schema Requirements

The primary key field **MUST**:

- exist on the resource schema
- be defined as `readOnly: true`
- declare an `x-insert` value
- use `format: uuid`
- be immutable

Example:

```yaml
carId:
  description: Unique identifier for the car
  type: string
  format: uuid
  readOnly: true
  example: "a3bb189e-8bf9-3888-9912-ace4e6543002"
  x-insert: uuid
```

During `POST`:
- clients **MUST NOT** supply the ID
- Apistry generates and persists it automatically

---

### Identity vs Uniqueness

Fields such as `vin` may be unique but **MUST NOT** be used as primary keys.

Reasons:
- business identifiers may change
- they may contain sensitive data
- using them as IDs risks data leakage via logs and URLs

Primary keys exist for **identity**, not meaning.

---

## Sub-Resources (Strict Rules)

Sub-resources in Apistry are **not independent models**.

A sub-resource is explicitly defined as:

> An **array property declared on a parent resource schema**.

The sub-resource path exists **only to grant controlled access to that array**.
It does not introduce a new resource, model, or lifecycle.

- One level only
- IDs required for mutation
- No paging

---

### Mandatory Existence

- A sub-resource **MUST exist** on the parent schema
- The parent resource **MUST declare the sub-resource as an array**
- A sub-resource **MUST NOT** be declared if it does not exist on the parent

#### Valid example

```yaml
Car:
  type: object
  properties:
    events:
      type: array
      items:
        $ref: '#/components/schemas/Event'
```

```yaml
/cars/{carId}/events:
  get: ...
```

#### Invalid example

```yaml
# INVALID: `events` is not declared on Car
/cars/{carId}/events:
  get: ...
```

If the parent schema does not define the array, the sub-resource path is invalid
and the contract is rejected.

---

## Ownership Model

- The parent resource **owns** the sub-resource
- Sub-resources have **no independent lifecycle**
- Persistence is always scoped to the parent document

All sub-resource mutations operate on the parent-owned array.

---

## Nesting Limits

- Only **one level** of sub-resource is supported
- A sub-resource **CANNOT** itself have sub-resources

Even if the object model contains arrays within arrays:

- Nested arrays are allowed in schemas
- Exposing nested arrays as sub-resources is **NOT allowed**
- Paths such as `/cars/{id}/events/{eventId}/notes` are invalid

This rule prevents:
- ambiguous ownership
- unbounded routing complexity
- lifecycle violations

---

## Bulk Update Semantics (Update Many)

Bulk update operations are **best-effort and non-atomic by design**.

### Processing Rules

- Each item eligible for update is processed independently
- All items that can be updated successfully **will be updated**
- Failures on one or more items **do not roll back successful updates**

### Failure Handling

- One or more failures may occur during a bulk update
- Failures are **recorded and surfaced** in the response
- The operation does not fail fast on the first error

### Client Responsibility

- Apistry does **not** guarantee all-or-nothing behavior
- Clients are responsible for:
  - inspecting the response
  - determining which items succeeded
  - determining which items failed
  - deciding whether retries or compensating actions are required

Future versions may introduce a structured multi-response model.
Current behavior is explicit and intentional.

---

## Mutation Rules

- Sub-resources **MUST have identifiers** to support mutation
- Paging is **NOT supported** on sub-resources
- Bulk operations are constrained and explicit
- Read-only rules apply identically to bulk and single mutations
- PUT on collections invalid
- Primitive PUT invalid

---

## Duplicate Handling

This rule applies only to arrays of primitives (e.g., `string[]`, `number[]`).

### Object arrays

For arrays of objects, Apistry **does not** attempt to infer what a “duplicate” means.
On `POST`/insert, Apistry cannot detect duplicates without an explicit alternate-key definition.
If you need duplicate detection for object arrays, model the alternate key(s) explicitly and/or
enforce uniqueness at the database layer.

### Top-level resources

Top-level duplicate handling is typically enforced by the database via unique indexes
(single-field or compound). Apistry does not manage indexes. If the database rejects a write
due to a uniqueness constraint, the database error is surfaced to the client.

---

## Sub-resource mutation responses

Sub-resource endpoints exist only to manipulate a parent-owned array. For mutation operations,
Apistry supports two response shapes:

- **Status-only**: return an appropriate success status code with no body.
- **Full array**: return the **entire updated array** after the mutation.

Returning only the mutated items is **not supported**.

---

## Delete many

Delete-many operations apply the **same filters as GET** to select the items to delete.
This is powerful and should be used with caution.

Behavior:

- All items that match the filter are candidates for deletion.
- Partial success is allowed (some items may delete while others fail).
- The response may be:
  - a body containing deleted items (optionally wrapped), or
  - `204 No Content`.

---

## Resource ID nullability

Resource IDs are UUIDs and are **never nullable**.
A resource ID must always exist for persisted resources and is immutable once created.

These constraints are foundational to Apistry’s lifecycle guarantees.

## Summary

- Resources have exactly one opaque UUID primary key
- Sub-resources are **arrays on a parent**
- Paths do **NOT** create models
- Existence is mandatory
- Nesting is prohibited
- Ownership is explicit
- Bulk updates are **best-effort**
- Partial success is expected and visible
