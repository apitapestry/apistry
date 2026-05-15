# compare

Generic schema-driven comparison validator.

`compare` is an enterprise-safe, contract-driven comparison rule whose semantics are **derived exclusively from the
schema type/format at the validation attachment point**.

**Applicable To:** property

---

## Supported operators

- Binary comparisons: `<`, `<=`, `>`, `>=`, `=`, `!=`, `<>`
- Set/range comparisons:
    - `in` — right-hand side is an array of allowed values
    - `between` — right-hand side represents an inclusive min/max bound

---

## Normalized/case-insensitive string comparison

When comparing strings for equality (`=`, `!=`, `<>`), you can enable normalization (trimming and lowercasing) by setting the `normalize: true` or `caseInsensitive: true` parameter. This allows for case-insensitive and whitespace-insensitive comparisons, replacing the previous `normalizedEquals` validator.

**Example:**

```yaml
confirmEmail:
  type: string
  x-validations:
    - function: compare
      parameters:
        operator: "="
        field: email
        normalize: true
```

This will pass if `confirmEmail` and `email` match after trimming and lowercasing both values.

---

## Operand sources

Right-hand side operand must be supplied via exactly one of:

- `value`: a literal comparison value (or a `now...` token)
- `field`: the name/path to another field in the same object (currently top-level property name)

---

## Schema-driven typing (no explicit datatype parameter)

`compare` determines comparison semantics strictly from the resolved OpenAPI schema:

### Numeric

- `type: number` or `type: integer`
    - Values are coerced to numbers.
    - If coercion fails:
        - **Left-hand side** coercion failure is a **data** error.
        - **Right-hand side** coercion failure is a **definition** error.

**Special numeric values (integer/number only)**

- `now(year)` (case-insensitive) may be used to represent the current year.
- `now(year)±<n>y` may be used to offset that year (e.g., `now(year)-50y`, `now(year)+1y`).

> Notes
> - Only `now(year)` is supported for numeric comparisons.
> - Only the `y` (years) unit is supported with `now(year)`.

### Date / date-time

- `type: string` with `format: date-time` or `format: date`
    - Values are parsed as RFC 3339 / ISO-8601 using JavaScript date parsing.
    - If parsing fails, validation fails.

**Special datetime values (for `format: date-time` and `format: date` only)**

`value` (or the resolved `field`) may be:

- `now` (case-insensitive)
- `now(year)` — truncate current datetime to the start of the year
- `now(month)` — truncate current datetime to the start of the month
- `now(day)` — truncate current datetime to the start of the day

**Relative now offsets (date/date-time)**

You can offset `now` (and truncated `now(...)`) using:

- `now±<n><unit>`
- `now(<truncate>)±<n><unit>`

Where `<unit>` is one of:

- `y` (years)
- `mo` (months)
- `d` (days)

Examples:

- `now-18y`
- `now-2mo`
- `now(day)+7d`

### Time

- `type: string` with `format: time`
    - Values must match RFC3339 partial-time: `HH:MM:SS` with optional fractional seconds.
    - Comparison is done by time-of-day.

### Unsupported

Any other schema type/format combination is rejected. Plain lexicographic string comparison is not allowed unless
explicitly supported by schema format.

---

## Coercion rules

- **Datetime**: must parse as RFC 3339 / ISO-8601 (invalid parses fail with 422)
- **Numeric**: must coerce to a finite number (invalid coercion fails with 422)
- **No silent fallback**: invalid RHS/LHS parsing causes validation failure
- **No cross-type comparisons**: behavior is driven by schema only

---

## Status codes

Status codes are applied centrally by the validation execution pipeline:

- `422` — input fails validation OR rule definition is invalid/unsupported
- `500` — reserved for outbound HTTP dependency failures only (not used by `compare`)

---

## Examples

### 1) Field comparison

```yaml
startDate:
  type: string
  format: date
  x-validations:
    - function: compare
      parameters:
        operator: "<"
        field: endDate
```

### 2) Compare to a fixed date

```yaml
manufactureDate:
  type: string
  format: date
  x-validations:
    - function: compare
      parameters:
        operator: ">="
        value: "2020-01-01"
```

### 3) Compare to now (date/date-time)

```yaml
createdAt:
  type: string
  format: date-time
  x-validations:
    - function: compare
      parameters:
        operator: "<="
        value: now
```

### 4) Compare to truncated now

```yaml
createdAt:
  type: string
  format: date-time
  x-validations:
    - function: compare
      parameters:
        operator: ">="
        value: "now(day)"
```

### 5) Age check (must be at least 18 years old)

```yaml
birthDate:
  type: string
  format: date
  x-validations:
    - function: compare
      parameters:
        # birthDate must be on/before now minus 18 years
        operator: "<="
        value: "now-18y"
```

### 6) Recency check (must be within last 2 months)

```yaml
lastUpdatedAt:
  type: string
  format: date-time
  x-validations:
    - function: compare
      parameters:
        # must be on/after now minus 2 months
        operator: ">="
        value: "now-2mo"
```

### 7) Membership (in)

> Note: `in` works for numeric/date/date-time/time schemas. Plain strings without a supported format are intentionally
> rejected.

```yaml
hourOfDay:
  type: string
  format: time
  x-validations:
    - function: compare
      parameters:
        operator: in
        value: [ "09:00:00", "17:00:00" ]
```

### 8) Range (between)

```yaml
age:
  type: number
  x-validations:
    - function: compare
      parameters:
        operator: between
        value: [ 18, 65 ]
```

### 9) Model year range (integer year between 50 years ago and 1 year in the future)

```yaml
year:
  type: integer
  x-validations:
    - function: compare
      parameters:
        operator: ">="
        value: "now(year)-50y"
    - function: compare
      parameters:
        operator: "<="
        value: "now(year)+1y"
```

### 10) Not equal

```yaml
statusChangedAt:
  type: string
  format: date-time
  x-validations:
    - function: compare
      parameters:
        operator: "!="
        value: "now(day)"
```

### 11) Case-insensitive/normalized string equality

```yaml
username:
  type: string
  x-validations:
    - function: compare
      parameters:
        operator: "="
        value: "ADMIN"
        caseInsensitive: true
```

This will pass if `username` is any case/whitespace variant of `ADMIN` (e.g., `admin`, ` Admin `, etc).

---

**Note:** The previous `normalizedEquals` validator is now deprecated. Use `compare` with `normalize: true` or `caseInsensitive: true` for all normalized string equality checks.
