# Runtime Capabilities

This page focuses on *what the system does*, not *why it does it*.

Conceptual motivation and architectural philosophy are covered in the **[Concepts](concepts.md)** section.

This page will help developers to understand what Apistry supports and how those capabilities behave at runtime.

---

## OpenAPI-Driven APIs

Apistry executes OpenAPI 3.x contracts directly at runtime.

From a single contract, Apistry automatically provides:

- routing
- request and response validation
- persistence semantics
- query behavior
- documentation

No controllers, routers, or service scaffolding are generated or required.

### Supported Operations

Apistry derives REST behavior from standard OpenAPI operations:

- **GET** – Retrieve single or a collection of resources
- **POST** – Create new resources
- **PATCH** – Partially update resources
- **DELETE** – Remove resources
- **PUT** – Replace existing resources - _Intentionally NOT implemented!_

Each operation behaves deterministically based on the contract definition.

---

## Swagger UI Documentation

Swagger UI is automatically exposed for every running service:

- Available at `/swagger-ui` when `server.swaggerUiEnabled` is true
- Fully interactive
- Always reflects the running contract
- Requires no separate documentation maintenance

Because the contract drives runtime behavior, documentation and implementation are **`ALWAYS`** in sync.

---

## Data & Persistence

Apistry provides built-in persistence behavior for document-oriented data models.

### Collection Mapping

- Each OpenAPI **tag** maps to a collection
- The **first tag** on an operation determines the target collection
- Collection names are normalized automatically

### Supported Databases

- **SQLite (built-in)**  
  In-memory or filesystem-backed database for local development and evaluation

- **MongoDB**
  `mongodb+srv://` works end-to-end in the current implementation. `mongo://` is routed by the dispatcher but rejected by the Mongo adapter validation.

- **PostgreSQL**
  Selected with `postgres://` or `postgresql://` connection strings

---

## Auto-Collection Creation

Apistry will create the collection on first use if it does not already exist.

---

## Querying & Filtering

Apistry supports rich querying through URL parameters.

### Comparison Operators

```http
GET /v1/cars?make=eq.Toyota
GET /v1/cars?price=gt.25000
GET /v1/cars?year=lte.2023
GET /v1/cars?notes=isNull
```

Supported operators include:
`eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `between`, `in`, `nin`, `isNull`, `isNotNull`

### Wildcard Matching

```http
GET /v1/cars?model=*Camry
GET /v1/cars?model=Cam*
GET /v1/cars?model=*Cam*
```

### Combining Filters

```http
GET /v1/cars?make=eq.Toyota&price=lt.25000&year=gte.2020
```

---

## Pagination & Sorting

### Pagination

```http
GET /v1/cars?limit=10
GET /v1/cars?offset=20&limit=10
```

### Sorting

```http
GET /v1/cars?order=price
GET /v1/cars?order=price.desc
GET /v1/cars?order=make.asc,price.desc
```

Pagination and sorting behavior is applied consistently across all collection endpoints.

---

## Bulk Operations

Apistry supports bulk operations where contract semantics allow.

### Bulk Insert

```http
POST /v1/cars
Content-Type: application/json

[
  { "make": "Toyota", "model": "Camry", "year": 2023 },
  { "make": "Honda", "model": "Accord", "year": 2023 }
]
```

### Bulk Update

```http
PATCH /v1/cars?make=eq.Toyota
Content-Type: application/json

{ "status": "certified" }
```

### Bulk Delete

```http
DELETE /v1/cars?year=lt.2015
```

---

## Response Shaping

Responses may be returned in several forms, as declared in the contract design.

### List With Paging Metadata

```yaml
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  contentRange:
                    type: string
                    example: items 0-24/100
                  results:
                    type: array
                    items:
                      $ref: '#/components/schemas/Car'
```

### Simple List

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

### Simple Object

```yaml
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Car'
```

### Response Code Only

```yaml
      responses:
        '201':
          description: Created successfully
```

This flexibility supports both simple APIs and paginated UI use cases.

---

## Request Validation

Apistry enforces validation automatically at multiple levels.

Request Validation

- Path parameters
- Query parameters
- Headers
- Request body

Response Validation

- Responses are validated against the contract schema
- Contract mismatches are detected before responses are returned

Validation is powered by AJV and JSON Schema.

Invalid requests never reach business logic.

---

## Post-Persistence Processing (Explicit Boundary)

Apistry **does not execute ANY custom business logic after data is persisted**.

Once state is committed:
- Apistry’s responsibility ends
- No post-save hooks or workflows are executed
- No long-running or compensating logic occurs inside the request lifecycle

If post-persistence behavior is required (notifications, workflows, coordination), it should be implemented in 
**external, event-driven systems** that react to persisted state changes.

Apistry commits truth.  
Other systems interpret and act on it.
