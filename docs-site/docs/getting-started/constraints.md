# Validation Constraints

Not all rules required for safe persistence can be expressed through schema validation alone.

Many systems require **semantic validation constraints** to determine whether a request may be persisted. These include:

- cross-field dependencies
- eligibility or policy rules
- temporal constraints (e.g. relative to “now”)
- standards-based coherence checks (e.g. country, state, postal codes)

Apistry supports these cases through **built-in validation constraints**.

Validation constraints determine *data validity*, NOT behavior.  
They exist solely decide whether persisting the payload is allowed or not.

---

## Declaring Validation Constraints

Validation constraints are declared directly in the API contract and reference **named, built-in validation functions**
provided by Apistry.

Each validation function evaluates the associated property and returns a determination of whether that property is valid or not.

Validation constraints are:

- explicitly declared in the contract
- evaluated prior to persistence
- deterministic and side-effect free
- reusable across APIs
- fully defined and versioned by the platform

All validation logic is therefore visible, reviewable, and governed by the contract itself.

If a validation is required beyond what is provided, contact the Apistry team to discuss potential inclusion in the platform.

---

## No Custom Validation Logic

Apistry **does not support user-defined or custom validation constraints**.

This is an intentional architectural decision.

Allowing arbitrary validation logic at the API boundary introduces hidden execution, unpredictable performance,
and implicit workflow semantics. Over time, this turns API services into general-purpose execution engines.

Apistry avoids this outcome by enforcing a strict rule:

> **Only platform-provided validation constraints may participate in write admission.**

When a use case appears to require custom validation, it is reviewed to determine whether:

1. the rule represents a reusable semantic constraint suitable for the platform, or
2. the rule is not a pre-persistence validation concern and belongs elsewhere in the system.

This review process ensures that validation remains:

- finite
- predictable
- explainable
- reusable across domains

---

## Failure Semantics

Validation failures represent invalid client input and result in a **422 Unprocessable Entity** response.

Validation never:

- mutates data
- performs persistence
- triggers side effects
- initiates workflows

Validation exists solely to decide whether a request represents a fact that may be stored.

---

## Why This Boundary Matters

Allowing extensibility at the API boundary inevitably shifts responsibility away from contracts and toward execution.

Apistry enforces a single governing principle:

> **An API service may only decide whether a fact may exist.**

By restricting validation to a closed, platform-governed set of constraints, Apistry ensures that APIs remain:

- boring
- predictable
- scalable
- reviewable
- contract-driven

Persistence is the boundary.  
Validation protects it.  
Everything else happens elsewhere.

---

## Provided Validation Functions

| Name                            | Category              | Description                                        | Example                                   |
|---------------------------------|-----------------------|----------------------------------------------------|-------------------------------------------|
| requires                        | Cross-field presence  | If this field exists, another field must exist     | `endDate requires startDate`              |
| forbids                         | Cross-field exclusion | If this field exists, another field must not exist | `personalEmail forbids workEmail`         |
| requiredIf                      | Conditional presence  | Field required when another field equals a value   | `cancelReason if status=cancelled`        |
| exactlyOneOf                    | Cross-field presence  | Exactly one of the listed fields must be present   | `exactlyOneOf [ssn, passportNumber]`      |
| atLeastOneOf                    | Cross-field presence  | At least one of the listed fields must be present  | `atLeastOneOf [email, phone]`             |
| allOrNone                       | Cross-field presence  | Either all listed fields are present or none are   | `allOrNone [city, state, zip]`            |
| equals                          | Cross-field coherence | Field value must equal another field               | `confirmEmail equals email`               |
| differsFrom                     | Cross-field coherence | Field value must differ from another field         | `newPassword differsFrom currentPassword` |
| normalizedEquals                | Cross-field coherence | Values must match after normalization              | `email normalizedEquals confirmEmail`     |
| olderThan                       | Temporal semantics    | Date must be earlier than now minus duration       | `birthDate olderThan 18y`                 |
| newerThan                       | Temporal semantics    | Date must be later than now minus duration         | `passwordChangedAt newerThan 90d`         |
| after                           | Temporal semantics    | Date must be after another date field              | `endDate after startDate`                 |
| before                          | Temporal semantics    | Date must be before another date field             | `signupDate before activationDate`        |
| uniqueBy                        | Array semantics       | Array elements must be unique by property          | `roles uniqueBy code`                     |
| sortedBy                        | Array semantics       | Array must be sorted by property                   | `milestones sortedBy dueDate asc`         |
| maxItemsWhere                   | Array semantics       | Conditional max items in array                     | `type=PRIMARY max=1`                      |
| sumEquals                       | Numeric semantics     | Sum of numeric values must equal constant          | `allocations sumEquals 100`               |
| sumLessThanOrEqual              | Numeric semantics     | Sum of numeric values must not exceed max          | `discounts sum ≤ total`                   |
| ratioWithin                     | Numeric semantics     | Ratio between two fields within bounds             | `downPayment/price between 0.05–0.30`     |
| validChecksum                   | Identifier semantics  | Validate checksum-based identifiers                | `creditCard validChecksum luhn`           |
| zipCompatibleWithState          | Standards coherence   | ZIP prefix must plausibly align with state         | `90210 with CA`                           |
| stateCodeValidForCountry        | Standards coherence   | Subdivision code valid for country                 | `CA valid for US`                         |
| postalCodeCompatibleWithCountry | Standards coherence   | Postal code format matches country                 | `75001 compatible with US`                |
| phoneCodeCompatibleWithCountry  | Standards coherence   | Phone calling code matches country                 | `+1 compatible with US`                   |
| currencyValidForCountry         | Standards coherence   | Currency valid for country                         | `USD valid for US`                        |
| timeZoneValidForCountry         | Standards coherence   | Timezone belongs to country                        | `America/Denver valid for US`             |
| increaseOnly                    | Prior-state           | Value may not decrease                             | `version monotonicIncrease`               |
| decreaseOnly                    | Prior-state           | Value may not increase                             | `remainingUses monotonicDecrease`         |
| deltaWithin                     | Prior-state           | Change from prior value within bounds              | `price deltaWithin ±10%`                  |

base64
countryCode ISO3166 alpha-2
currencyCode ISO4217
timeZone IANA time zone
noSQLInjectionPostgres basic SQL injection patterns
PhoneNumber E.164 format - library based??? google libphonenumber
Profanity common profane words
RoutingNumber valid financial routing number
statePostalCode - requires json file
regionCode
mapKeyPattern - not needed with openapi 3.1.x
**url RFC 3986 format - param: allow localhost**
whiteSpaceOnly
immutableIf if prop value in a list of values
mutableIf if prop value in a list of values
requiredIf if prop value in a list of values, list of props must be present
