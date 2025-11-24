# Features

This page provides a comprehensive overview of Apistry's capabilities and how to use them.

- **OpenAPI Contract**: Define your API using OpenAPI 3.0 specifications, and the service automatically creates functional endpoints
- **Swagger UI Documentation**: Automatically generated interactive API documentation available at `/docs`
- **Auto-Collection Creation**: Automatically validates and creates MongoDB database and collections based on OpenAPI
  tags during server startup
- **MongoDB Integration**: Built-in CRUD operations with advanced query capabilities
- **Flexible Querying**: Support for operators like `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `isNull`, and wildcard
  matching
- **Bulk Operations**: Support for bulk inserts, updates, and deletes
- **Response List Handling**: Optional metadata in responses including total count and pagination information
- **Validation**: Automatic parameter, request/response validation using AJV and JSON Schema
- **Fastify-Based**: Built on the high-performance Fastify web framework
  [//]: # (- **AWS Lambda Ready**: Can be deployed as a Lambda function or run locally)

## OpenAPI Contract

Apistry automatically generates REST API endpoints based on your OpenAPI contract:

- **GET** - Retrieve single resources or collections
- **POST** - Create new resources
- **PUT** - Replace existing resources
- **PATCH** - Partially update resources
- **DELETE** - Remove resources

Each operation is mapped from your contract to a functional endpoint without writing any code.

## Swagger UI Documentation

Apistry automatically generates Swagger UI documentation:

- Available at `http://localhost:3000/docs` when running
- Interactive - test endpoints directly from the browser
- Always in sync with your contract
- No separate documentation maintenance needed

## Auto-Collection Creation

Apistry validates that required collections exist on startup and can:
- Prompt to create missing collections
- Automatically create collections (with `--enableAutoCollectionCreate yes` flag)
- Exit if collections are missing and creation is declined

See [Auto Collection Create](start-server.md/#auto-collection-create) for details.

## MongoDB Integration

Apistry provides built-in CRUD operations with advanced query capabilities through MongoDB integration.

### Collection Mapping
- Each OpenAPI tag corresponds to a MongoDB collection
- The first tag on an operation determines which collection to use
- Collection names are automatically normalized (lowercased)

## Flexible Querying

Apistry supports advanced querying through URL parameters:

**Comparison Operators:**
```bash
# Equal
GET /v1/cars?make=eq.Toyota

# Not equal
GET /v1/cars?make=neq.Toyota

# Greater than
GET /v1/cars?price=gt.25000

# Less than
GET /v1/cars?price=lt.25000

# Greater than or equal
GET /v1/cars?year=gte.2020

# Less than or equal
GET /v1/cars?year=lte.2023

# Is null
GET /v1/cars?notes=isNull.true
```

**Wildcard Matching:**
```bash
# Starts with
GET /v1/cars?model=*Camry

# Ends with
GET /v1/cars?model=Camry*

# Contains
GET /v1/cars?model=*Cam*
```

**Combining Filters:**
```bash
# Multiple conditions
GET /v1/cars?make=eq.Toyota&price=lt.25000&year=gte.2020
```

### Pagination
Control result sets with pagination parameters:

```bash
# Limit results
GET /v1/cars?limit=10

# Offset results
GET /v1/cars?offset=20&limit=10

# Both (page 3 of 10 items per page)
GET /v1/cars?offset=20&limit=10
```

### Sorting
Sort results by one or more fields:

```bash
# Ascending
GET /v1/cars?sort=price

# Descending
GET /v1/cars?sort=-price

# Multiple fields
GET /v1/cars?sort=make,-price
```

## Bulk Operations

**Bulk Insert**
Create multiple resources in a single request:

```bash
POST /v1/cars
Content-Type: application/json

[
  {"make": "Toyota", "model": "Camry", "year": 2023},
  {"make": "Honda", "model": "Accord", "year": 2023},
  {"make": "Ford", "model": "F-150", "year": 2024}
]
```

**Bulk Update**
Update multiple resources matching criteria:

```bash
PATCH /v1/cars?make=eq.Toyota
Content-Type: application/json

{"status": "certified"}
```

**Bulk Delete**
Delete multiple resources matching criteria:

```bash
DELETE /v1/cars?year=lt.2015
```

## Response List Handling

Collection responses can follow either of the following formats:

**ContentRange in response:**
```yaml
      responses:
        '200':
          description: A list of cars matching the search criteria
          headers:
            Content-Range:
              description: The range of items returned and total count
              style: simple
              explode: false
              schema:
                type: string
                example: items 0-24/100
          content:
            application/json:
              schema:
                type: object
                properties:
                  contentRange:
                    type: string
                    description: The content range of the response
                    example: items 0-24/100
                  results:
                    type: array
                    items:
                      $ref: '#/components/schemas/Car'
}
```

**More standard REST response - simple List<Response>:**
```yaml
      responses:
        '200':
          description: A list of cars matching the search criteria
          headers:
            Content-Range:
              description: The range of items returned and total count
              style: simple
              explode: false
              schema:
                type: string
                example: items 0-24/100
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Car'
}
```

Useful for building paginated UIs and understanding result sets.

## Validation

Apistry provides automatic validation at multiple levels:

**Schema Validation**
- All requests are validated against the schemas defined in your OpenAPI contract
- Uses AJV (Another JSON Schema Validator) for fast, accurate validation
- Returns clear error messages when validation fails

**Request Validation**
- Path parameters
- Query parameters
- Headers
- Request body

**Response Validation**
- Ensures responses match the contract's response schemas
- Helps catch contract/implementation mismatches early

<br><br>
