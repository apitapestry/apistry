# Validations

This section documents Apistry's **built-in validation functions**.

Apistry uses validation to enforce a strict architectural boundary:

- **Persistence establishes durable truth**
- **Persistence is the execution boundary**
- Validations are **deterministic**, **declarative**, and evaluated **pre-persistence**
- Validation failures return **HTTP 422 Unprocessable Entity**

To reduce conceptual overload, validation documentation is split into:

- **Concepts** (why/when): **Core Concepts → Validation Model** (`core-concepts/validation-model.md`)
- **Reference** (how/syntax): **Reference → Validation Reference** (`reference/validation-reference.md`)
- **Function catalog** (per-validator semantics): the pages listed below

---

## Validation Categories (catalog index)

The list below categorizes validations by **architectural role**, not implementation detail, so the validation surface stays stable over time.

### 1. Scalar Value Constraints

Operate on a single value or a pair of values.

- [**compare**](reference/validations/compare.md)
- [**ratioWithin**](reference/validations/ratioWithin.md)
- [**immutableIf**](reference/validations/immutableIf.md)

---

### 2. Cardinality & Presence Constraints

Operate on sets of fields.

- [**exactlyOneOf**](reference/validations/exactlyOneOf.md)
- [**atLeastOneOf**](reference/validations/atLeastOneOf.md)
- [**allOrNone**](reference/validations/allOrNone.md)

---

### 3. Conditional State Constraints

Enforce rules based on presence or equality of other fields.

- [**requiredIf**](reference/validations/requiredIf.md)
- [**requires**](reference/validations/requires.md)
- [**forbids**](reference/validations/forbids.md)

---

### 4. Collection & Structural Constraints

Operate on arrays or object structures.

- [**uniqueBy**](reference/validations/uniqueBy.md)
- [**sortedBy**](reference/validations/sortedBy.md)
- [**maxItemsWhere**](reference/validations/maxItemsWhere.md)
- [**mapKeyPattern**](reference/validations/mapKeyPattern.md)

---

### 5. Numeric Aggregation Constraints

Operate over collections with numeric aggregation semantics.

- [**sumEquals**](reference/validations/sumEquals.md)
- [**sumLessThanOrEqual**](reference/validations/sumLessThanOrEqual.md)

---

### 6. Format, Locale & Standards Compliance

Validate values against external standards or well-defined formats.

- [**base64**](reference/validations/base64.md)
- [**url**](reference/validations/url.md)
- [**timeZone**](reference/validations/timeZone.md)
- [**countryCode**](reference/validations/countryCode.md)
- [**currencyCode**](reference/validations/currencyCode.md)
- [**regionCode**](reference/validations/regionCode.md)
- [**postalCodeCountry**](reference/validations/postalCodeCountry.md)
- [**statePostalCode**](reference/validations/statePostalCode.md)
- [**usPhoneNumber**](reference/validations/usPhoneNumber.md)

---

### 7. Security & Data Hygiene

Protect against malformed or malicious input.

- [**noSqlInjectionMongo**](reference/validations/noSqlInjectionMongo.md)
- [**profanity**](reference/validations/profanity.md)
- [**whiteSpaceOnly**](reference/validations/whiteSpaceOnly.md)
- [**validChecksum**](reference/validations/validChecksum.md)

---

### 8. External Admissibility Constraints

Validate request admissibility using authoritative external systems.

- [**httpCheck**](reference/validations/httpCheck.md)
