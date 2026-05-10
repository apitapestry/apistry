---
hide:
  - toc
---
# Defining Filters (Contract Authoring)

This page is for **API developers**.
It explains how the way you define **query parameters in your OpenAPI contract** determines what filtering capabilities clients can use.

For client-facing query string syntax (operators, `in`, wildcards, etc.), see `query-filters.md`.

---

## Big idea: the contract controls the filter “surface area”

Apistry supports a rich filter language, but clients can only use parts of it if the contract allows the required *input shapes*.

Two common ways the contract restricts or enables filters:

1. **`enum`** (very restrictive): only those exact values are allowed.
2. **`pattern`** (fine-grained): controls which characters and formats are allowed.

---

## Capability by character set

Most advanced filter features depend on a few characters being permitted by the parameter schema (usually via `pattern`).

| Feature you want clients to use | Client must be allowed to send | Why |
|---|---|---|
| Operator prefix (`gt.`, `lte.`, `in.`, etc.) | the letters `g`, `t`, `l`, `e`, `n`, `i`, `q` and a dot `.` | operators use the `op.value` form (e.g. `gt.`, `lte.`, `in.`, `neq.`, `eq.`) |
| List membership (`in` / `nin`) | the letters `i`, `n`, commas `,`, (optionally brackets `[` `]`), and a dot `.` | `in`/`nin` require the operator prefix (`in.`/`nin.`) and comma/bracket for lists |
| Wildcard matching | asterisk `*` | wildcard matching is activated by `*` |
| Null checks | the literals `isNull` / `isNotNull` | these are interpreted as special values |

If the parameter schema does **not** allow one of these characters/strings, that capability is effectively disabled.

---

## Contract authoring cheat-sheet (types + patterns → query capability)

> Rule of thumb: operators and advanced search require certain characters to be valid input.
>
> - To support all operator prefixes, your pattern must allow the letters `g`, `t`, `l`, `e`, `n`, `i`, `q` and a dot `.` (for `eq.`, `neq.`, `gt.`, `gte.`, `lt.`, `lte.`, `in.`, `nin.`)
> - `,` (and optionally `[` `]`) enables lists (`in` / `nin`)
> - `*` enables wildcards

| Parameter data type | Contract definition style | Example OpenAPI schema snippet | What clients can do | Example requests |
|---|---|---|---|---|
| `string` + `enum` | **Exact match only**, single value | `type: string` + `enum: [blue, brown, red]` | Only exact equality against a controlled vocabulary. No wildcards, no operator prefixes, no `in`. | ✅ `?color=blue`  • ❌ `?color=in.blue,brown` • ❌ `?color=*bl*` |
| `string` (open) + pattern that **blocks** `. , *` | Free-form string, but **no operator language** | `type: string` + `pattern: '^[A-Za-z0-9 _-]+$'` | Equality-only string matches (plus `isNull`/`isNotNull` only if you explicitly allow those literals). | ✅ `?model=Camry` • ❌ `?model=neq.Camry` • ❌ `?model=Cam*` |
| `string` (open) + operator-enabled pattern | Free-form string **with operators** | `type: string` + `pattern: '^[A-Za-z0-9._,\[\]* gtlneqi-]+$'` | Operator prefixes (`eq/neq/gt/gte/lt/lte/in/nin`) and wildcards. | ✅ `?color=in.blue,brown` • ✅ `?make=neq.Toyota` • ✅ `?model=Cam*` |
| `integer` | Range operators make sense | `type: integer` | `gt/gte/lt/lte` are meaningful. If you want `op.value` syntax, model the parameter to accept it (commonly as a string with a suitable pattern) or define dedicated range parameters. | ✅ `?year=gte.2015` • ✅ `?year=lt.2020` |
| `number` | Same as integer, but decimals | `type: number` | Same as integer, but supports decimals. | ✅ `?price=lt.19999.99` |
| `boolean` | Usually exact match only | `type: boolean` | Usually `true/false` equality. (You can choose to allow `neq.` by allowing operator syntax for that parameter.) | ✅ `?archived=false` |
| `string` with `format: date` | Day match + ranges | `type: string` + `format: date` | Supports day-level equality and `gte/lte` style ranges if you allow operator syntax. | ✅ `?createdAt=eq.2026-02-27` • ✅ `?createdAt=gte.2026-02-01&createdAt=lte.2026-02-29` |

---

## Common design patterns

### Pattern 1: strict enum parameter (single-value exact match)

Use this when you want exactly one value with no operator language.

```yaml
parameters:
  - in: query
    name: color
    schema:
      type: string
      enum: [blue, brown, red]
```

### Pattern 2: open string but “safe” (no operators, no wildcards)

```yaml
parameters:
  - in: query
    name: model
    schema:
      type: string
      pattern: '^[A-Za-z0-9 _-]+$'
```

### Pattern 3: operator-enabled string

```yaml
parameters:
  - in: query
    name: color
    schema:
      type: string
      pattern: '^[A-Za-z0-9._,\[\]* gtlneqi-]+$'
```

---

## Recommendations

- Use **enums** for controlled vocabularies (fast, safe, predictable).
- Use patterns to explicitly allow only the operator surface area you want.
- Consider blocking `*` unless you’re comfortable with the performance profile of wildcard queries.
- If you want multi-select, consider defining the parameter as an array (and document the expected query string form).

## References

- Example contract: `contracts/cars/cars.v1.yaml`
- Query string basics: `query-filters.md`
- Pagination: `pagination.md`

---

## Least-restrictive reference (by data type)

Use this as a quick contract-authoring reference.
It answers: *for a given underlying data type, what operations make sense, and what’s a least-restrictive parameter definition that allows them?*

> Notes
> - Operator-style query strings are still **strings at the HTTP layer**.
> - If you want to support `gte.10`, `in.a,b`, `*` wildcards, etc., the parameter must allow those characters.
> - For numeric/date fields, many teams model the **filter parameter** as a `string` with a strict `pattern`, even if the underlying stored field is numeric/date.

### Summary table

| Underlying field type | Operations that usually make sense | Sample pattern / schema |
|---|---|---|
| String (open text) | `eq`, `neq`, `in`, `nin`, wildcard (`*`), `isNull`, `isNotNull` | `^(?:[A-Za-z0-9 _-]+)$|^(?:eq|neq|in|nin)\.(?:[A-Za-z0-9._,\[\]* _-]+)$|^(?:isNull|isNotNull)$` |
| String (controlled vocabulary) | single-select eq, or multi-select | Multi-select schema: `type: array`, `items: { type: string, enum: [...] }`  • Operator-style: `^(?:VAL1|VAL2)$|^(?:in|nin)\.(?:\[?(?:VAL1|VAL2)(?:,(?:VAL1|VAL2))*\]?)$` |
| Integer | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, optional `in`/`nin` | `^(?:-?\d+)$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?-?\d+(?:,-?\d+)*\]?)$` |
| Number (decimal) | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, optional `in`/`nin` | `^(?:-?\d+(?:\.\d+)?)$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*\]?)$` |
| Boolean | `eq` (and sometimes `neq`) | Strict schema: `type: boolean`  • Operator-style: `^(?:true|false)$|^(?:eq|neq)\.(?:true|false)$` |
| Date (`format: date`) | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, optional `in`/`nin` | `^(?:\d{4}-\d{2}-\d{2})$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?\d{4}-\d{2}-\d{2}(?:,\d{4}-\d{2}-\d{2})*\]?)$` |

### String (open text)

Least-restrictive parameter schema:

```yaml
schema:
  type: string
  # Allows letters/numbers/space plus operator/list/wildcard characters.
  pattern: '^[A-Za-z0-9._,\[\]*\s-]+$'
```

Example queries:

- `?name=Camry`
- `?name=neq.Camry`
- `?name=in.Camry,Civic`
- `?name=nin.[Camry,Civic]`
- `?name=Cam*`
- `?name=isNull`

### String (controlled vocabulary)

#### Single-select

```yaml
schema:
  type: string
  enum: [blue, brown, red]
```

- `?color=blue`

#### Multi-select (recommended)

```yaml
schema:
  type: array
  items:
    type: string
    enum: [blue, brown, red]
```

- `?color=blue&color=brown`

#### Operator-style (least restrictive, least controlled)

```yaml
schema:
  type: string
  pattern: '^[A-Za-z0-9._,\[\]*\s-]+$'
```

- `?color=in.blue,brown`
- `?color=neq.red`

### Integer

#### Strict eq-only

```yaml
schema:
  type: integer
```

- `?year=2019`

#### Operator-enabled (least restrictive)

```yaml
schema:
  type: string
  # Either a plain integer, OR an operator prefix + integer/list.
  pattern: '^(?:-?\d+)$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?-?\d+(?:,-?\d+)*\]?)$'
```

- `?year=gte.2015&year=lt.2020`
- `?year=in.[2018,2019,2020]`

### Number (decimal)

```yaml
schema:
  type: string
  # Either a plain number, OR an operator prefix + number/list.
  # Accepts leading '-', integer or decimal.
  pattern: '^(?:-?\d+(?:\.\d+)?)$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*\]?)$'
```

- `?price=lt.19999.99`
- `?rating=gte.4.5`
- `?rating=in.[4.5,5]`

### Boolean

#### Strict

```yaml
schema:
  type: boolean
```

- `?archived=false`

#### Operator-enabled

```yaml
schema:
  type: string
  pattern: '^(?:true|false)$|^(?:eq|neq)\.(?:true|false)$'
```

- `?archived=neq.true`

### Date (`format: date`)

#### Strict eq-only

```yaml
schema:
  type: string
  format: date
```

- `?createdAt=2026-02-27`

#### Operator-enabled (least restrictive)

```yaml
schema:
  type: string
  # Either a plain YYYY-MM-DD, OR an operator prefix + YYYY-MM-DD (or list).
  pattern: '^(?:\d{4}-\d{2}-\d{2})$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?\d{4}-\d{2}-\d{2}(?:,\d{4}-\d{2}-\d{2})*\]?)$'
```

- `?createdAt=eq.2026-02-27`
- `?createdAt=gte.2026-02-01&createdAt=lte.2026-02-29`
- `?createdAt=in.[2026-02-01,2026-02-02]`

---

## Operator-gated patterns (recommended)

If you want the operator mini-language (`gt.`, `in.`, etc.) but **don’t** want to allow arbitrary dots/commas/asterisks in free-form values, define a pattern that:

1. **either** matches a plain value (no operator prefix)
2. **or** matches `operator.value` where `operator` is restricted to an explicit allowlist

This gives you a contract-level way to *only allow certain operators* per parameter.

### Generic operator-gated template

```yaml
schema:
  type: string
  # Either: a plain value (no operator)
  # Or: an allowed operator prefix + a value
  pattern: '^(?:PLAIN_VALUE)$|^(?:OPERATOR)\.(?:VALUE)$'
```

You’ll replace `PLAIN_VALUE` / `OPERATOR` / `VALUE` per data type.

### Operator allowlist

Most APIs use some subset of:

- `eq`, `neq`
- `gt`, `gte`, `lt`, `lte`
- `in`, `nin`

---

## Adjusted least-restrictive patterns (safer defaults)

The sections below include patterns that are “least restrictive” for *operations*, while still being **operator-gated** (so `.` is not just free-form).

### String (open text) — operator-gated + wildcard-enabled

```yaml
schema:
  type: string
  # Either a plain value with safe characters
  # OR an operator prefix + a value
  pattern: '^(?:[A-Za-z0-9 _-]+)$|^(?:eq|neq|in|nin)\.(?:[A-Za-z0-9._,\[\]* _-]+)$|^(?:gt|gte|lt|lte)\.(?:[A-Za-z0-9._-]+)$|^(?:isNull|isNotNull)$'
```

Notes:

- This allows wildcards (`*`) only when using the operator form.
- If you don’t want range operators (`gt`, `lte`, etc.) on strings, remove that group.

### Integer — operator-gated

```yaml
schema:
  type: string
  pattern: '^(?:-?\d+)$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?-?\d+(?:,-?\d+)*\]?)$'
```

### Number (decimal) — operator-gated

```yaml
schema:
  type: string
  pattern: '^(?:-?\d+(?:\.\d+)?)$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*\]?)$'
```

### Date (`format: date`) — operator-gated

```yaml
schema:
  type: string
  pattern: '^(?:\d{4}-\d{2}-\d{2})$|^(?:eq|neq|gt|gte|lt|lte|in|nin)\.(?:\[?\d{4}-\d{2}-\d{2}(?:,\d{4}-\d{2}-\d{2})*\]?)$'
```

### Enum with multi-select using `in.` / `nin.` (operator-style)

If you want clients to use `in.` / `nin.` for a controlled vocabulary, you can do it with a pattern.
This is more verbose to author, but it strictly controls values.

Example (conceptual for `blue|brown|red`):

```yaml
schema:
  type: string
  # Either a single literal, OR in/nin list made only of allowed literals.
  pattern: '^(?:blue|brown|red)$|^(?:in|nin)\.(?:\[?(?:blue|brown|red)(?:,(?:blue|brown|red))*\]?)$'
```

This enables:

- `?color=blue`
- `?color=in.blue,brown`
- `?color=nin.[red]`
