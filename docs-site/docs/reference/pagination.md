# Pagination

This page documents the pagination behavior implemented by `buildQueryOptions()`, `getHandler()`, and `formatResponse()`.

---

## Request Parameters

- `limit` defines the maximum number of returned items.
- `offset` defines how many items to skip.
- `offset` cannot be used without `limit`.
- `offset` must be a non-negative integer.

Example:

```http
GET /v1/cars?offset=20&limit=10
```

If `limit` is present, database adapters receive a limit option. If `offset` is present, they receive an offset option.

---

## Count Behavior

For top-level GET handlers, Apistry performs a count query when either `limit` or `offset` is present:

```js
options.limit !== undefined || options.offset !== undefined
```

Without `limit` and `offset`, no count is requested by `getHandler()`.

---

## Response Wrappers

Response formatting is driven by the OpenAPI response schema.

If the selected response schema is an object with a `results` property, Apistry treats it as a wrapper:

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          properties:
            results:
              type: array
              items:
                $ref: '#/components/schemas/Car'
```

For wrapper schemas, Apistry always includes `results`.

It does not automatically populate ordinary metadata properties such as `start`, `end`, `total`, `limit`, `nextQuerystring`, or `previousQuerystring` merely because those properties exist in the schema.

---

## Computed Metadata With `x-format`

Pagination values are computed internally and can be injected into string fields with `x-format`.

Available template keys:

- `start`
- `end`
- `total`
- `limit`
- `nextOffset`
- `prevOffset`
- `nextQuerystring`
- `previousQuerystring`

Example:

```yaml
properties:
  results:
    type: array
    items:
      $ref: '#/components/schemas/Car'
  nextPageUrl:
    type: string
    x-format: "/v1/cars?{nextQuerystring}"
  previousPageUrl:
    type: string
    x-format: "/v1/cars?{previousQuerystring}"
```

If a placeholder value is `null` or `undefined`, it is rendered as an empty string.

---

## Plain Arrays

If the response schema is an array, Apistry returns a plain array:

```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Car'
```

---

## Empty Results

If results are empty and the operation defines a `404` response, Apistry throws a 404.

Otherwise:

- wrapper schemas return `{ "results": [] }`
- array schemas return `[]`

---

## Sorting

Sorting uses the `order` query parameter, not `sort`.

Examples:

```http
GET /v1/cars?order=price
GET /v1/cars?order=price.desc
GET /v1/cars?order=make.asc,price.desc
```

Each segment is `field` or `field.direction`. Any direction other than `desc` is treated as ascending.
