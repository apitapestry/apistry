# Query Filters (Query String Basics)

This page is for **API consumers**.
It documents how to filter collections using query parameters (operator prefixes, lists, wildcard matching, and typed values).

For API developers defining query parameters (enums/patterns/types) and controlling which features clients can use, see `defining-filters.md`.

For paging (`offset`/`limit`), response wrappers, and count behavior, see `pagination.md`.

---

## Quick mental model

Filtering is expressed through query parameters:

- **Equality** (default): `?field=value`
- **Operator prefix**: `?field=op.value` where `op` is one of the supported operators (see below)
- **Special literals**: `isNull`, `isNotNull`
- **Wildcard match**: values containing `*` are treated like a case-insensitive wildcard pattern
- **Array values**: `?field=a&field=b` or `?field=[a,b]` is treated as `$in: [a, b]` (see below)

---

## Supported operations

> Notes
> - Operator prefixes are case-insensitive (`GT.5` works, but prefer lowercase).
> - If you don’t specify an operator prefix, `eq` is assumed.
> - If a value contains `*`, wildcard matching takes precedence over operator prefixes (e.g. `?name=gt.st*r` matches as wildcard, not as `gt`).
> - If a query parameter is repeated (e.g. `?field=a&field=b`), it is treated as a list: `$in: [a, b]`.
> - Plural resource names in the query are automatically rewritten to their singular form for filtering (e.g. `cars` → `car`).

| Operation                         | Query pattern                              | Example                      |
|-----------------------------------|--------------------------------------------|------------------------------|
| Equals (default)                  | `?field=value` or `?field=eq.value`        | `?status=active`             |
| Not equals                        | `?field=neq.value`                         | `?status=neq.disabled`       |
| Greater than                      | `?field=gt.value`                          | `?age=gt.21`                 |
| Greater than or equal             | `?field=gte.value`                         | `?age=gte.21`                |
| Less than                         | `?field=lt.value`                          | `?age=lt.65`                 |
| Less than or equal                | `?field=lte.value`                         | `?age=lte.65`                |
| Between (inclusive)               | `?field=between.min,max`                   | `?modelYear=between.2015,2020` |
| In list                           | `?field=in.a,b,c` or `?field=in.[a,b,c]` or `?field=a&field=b` | `?category=in.books,cars`    |
| Not in list                       | `?field=nin.a,b,c` or `?field=nin.[a,b,c]` | `?category=nin.[books,cars]` |
| Is null / empty string            | `?field=isNull`                            | `?nickname=isNull`           |
| Is not null / not empty string    | `?field=isNotNull`                         | `?nickname=isNotNull`        |
| Wildcard match (case-insensitive) | `?field=*pattern*` (any `*` in value)      | `?name=jo*n`                 |

### Wildcard semantics

Wildcard values are converted into a case-insensitive regular expression:

- `*` becomes `.*`
- if the value does **not** start with `*`, the pattern is anchored with `^`
- if the value does **not** end with `*`, the pattern is anchored with `$`
- Wildcard matching always takes precedence over operator prefixes if `*` is present in the value.

Examples:

- `?name=star*` → “starts with star”
- `?name=*star*` → “contains star”
- `?name=*star` → “ends with star”
- `?name=st*r` → “st then anything then r”
- `?name=gt.st*r` → matches as wildcard, not as `gt` operator

---

## Type coercion (how values become numbers/booleans/dates)

All query parameters arrive as strings, but Apistry will attempt to coerce them.
Coercion can be **contract-driven** (preferred) or **heuristic** (fallback).

### Contract-driven coercion (preferred)

If the contract provides a type hint, it’s used:

- `type: boolean` → `"true"`/`"false"` become booleans
- `type: integer` / `type: number` → numeric strings become numbers (integers are truncated)
- `type: string, format: date` → `YYYY-MM-DD` is treated specially (see below)

### Heuristic coercion (fallback)

If no schema hint exists:

- `"true"` / `"false"` → boolean
- `"null"` → `null`
- numeric strings (e.g. `"42"`, `"3.14"`) → numbers
- `YYYY-MM-DD` → treated as a “date-only” value
- otherwise → string

### Date-only behavior (`YYYY-MM-DD`)

A date-only value is interpreted as a **day range** in UTC.
Apistry pads it to:

- start of day: `YYYY-MM-DDT00:00:00.000Z`
- end of day: `YYYY-MM-DDT23:59:59.999Z`

This affects operators:

- `eq.YYYY-MM-DD` becomes “matches that day”
- `gt` / `gte` compare against the padded **start**
- `lt` / `lte` compare against the padded **end**

Examples:

- `?createdAt=eq.2026-02-27`
- `?createdAt=gte.2026-02-01&createdAt=lte.2026-02-29`

---

## Examples

### Simple equality

- `GET /cars?make=Toyota`
- `GET /videos?rating=PG-13`


### Numeric comparisons

- `GET /cars?modelYear=between.2015,2020` (modelYear between 2015 and 2020, inclusive)
- `GET /books?pages=gt.300`
### Range queries: between vs. multiple operators

**Do not** provide multiple range operators for the same field in a single request (e.g., `?price=gt.34&price=lt.48`). This is not supported and will not work as intended.

**Instead**, use the `between` operator for range queries:

- `?price=between.34,48` (price between 34 and 48, inclusive)

The `between` operator is the only supported way to specify a range for a single field in one request.


### Boolean filters

- `GET /notes?archived=false`

### List membership

- `GET /cars?color=in.red,blue,black`
- `GET /cars?color=nin.[green,yellow]`
- `GET /cars?color=red&color=blue` (array values)

### Null checks

- `GET /people?middleName=isNull`
- `GET /people?middleName=isNotNull`

### Wildcard matching

- `GET /people?lastName=Sm*` (starts with)
- `GET /people?lastName=*mit*` (contains)
- `GET /people?name=gt.st*r` (wildcard takes precedence)

---

## Constraints and safety

- Queries are schema-validated.
- Only fields explicitly marked queryable may be filtered.
- Type coercion applies only to query parameters.
- Plural resource names in the query are rewritten to singular for filtering.
- If a filter is not recognized, the value is passed through as-is (rare; for advanced use cases).

Delete-many operations reuse the same query filter semantics as GET for selecting items.

## References

- Defining filters (contract authoring): `defining-filters.md`
- Pagination: `pagination.md`
