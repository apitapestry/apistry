# APIstry Features

This page provides a comprehensive overview of APIstry's capabilities and how to use them.

## Core Features

### Automatic Endpoint Generation

APIstry automatically generates REST API endpoints based on your OpenAPI contract:

- **GET** - Retrieve single resources or collections
- **POST** - Create new resources
- **PUT** - Replace existing resources
- **PATCH** - Partially update resources
- **DELETE** - Remove resources

Each operation is mapped from your contract to a functional endpoint without writing any code.

### MongoDB Integration

#### Collection Mapping
- Each OpenAPI tag corresponds to a MongoDB collection
- The first tag on an operation determines which collection to use
- Collection names are automatically normalized (lowercased)

#### Auto-Collection Creation
APIstry validates that required collections exist on startup and can:
- Prompt to create missing collections
- Automatically create collections (with `--enableAutoCollectionCreate yes` flag)
- Exit if collections are missing and creation is declined

See [Collection Auto-Creation](collection-auto-creation.md) for details.

#### Query Capabilities
APIstry supports advanced querying through URL parameters:

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

#### Pagination
Control result sets with pagination parameters:

```bash
# Limit results
GET /v1/cars?limit=10

# Offset results
GET /v1/cars?offset=20&limit=10

# Both (page 3 of 10 items per page)
GET /v1/cars?offset=20&limit=10
```

#### Sorting
Sort results by one or more fields:

```bash
# Ascending
GET /v1/cars?sort=price

# Descending
GET /v1/cars?sort=-price

# Multiple fields
GET /v1/cars?sort=make,-price
```

### Bulk Operations

#### Bulk Insert
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

#### Bulk Update
Update multiple resources matching criteria:

```bash
PATCH /v1/cars?make=eq.Toyota
Content-Type: application/json

{"status": "certified"}
```

#### Bulk Delete
Delete multiple resources matching criteria:

```bash
DELETE /v1/cars?year=lt.2015
```

### Validation

APIstry provides automatic validation at multiple levels:

#### Schema Validation
- All requests are validated against the schemas defined in your OpenAPI contract
- Uses AJV (Another JSON Schema Validator) for fast, accurate validation
- Returns clear error messages when validation fails

#### Request Validation
- Path parameters
- Query parameters
- Headers
- Request body

#### Response Validation
- Ensures responses match the contract's response schemas
- Helps catch contract/implementation mismatches early

### Interactive Documentation

APIstry automatically generates Swagger UI documentation:

- Available at `http://localhost:3000/docs` when running
- Interactive - test endpoints directly from the browser
- Always in sync with your contract
- No separate documentation maintenance needed

### Response Metadata

Collection responses include optional metadata:

```json
{
  "data": [...],
  "metadata": {
    "total": 150,
    "offset": 20,
    "limit": 10,
    "returned": 10
  }
}
```

Useful for building paginated UIs and understanding result sets.

## Configuration

### Environment Variables

#### Required
```env
DB_CONNECTION=mongodb://username:password@hostname:port/database_name
```
MongoDB connection string including the database name.

#### Optional
```env
LOG_LEVEL=info  # Options: debug, info, warn, error (default: info)
```

### Command Line Options

```bash
apistry serve [options]

Options:
  -c, --contract <path>                    Path to OpenAPI contract file (required)
  --env <path>                             Path to .env file directory
  --enableAutoCollectionCreate <yes|no>    Auto-create missing collections
  --port <number>                          Port to run on (default: 3000)
```

### Examples

```bash
# Basic usage
apistry serve -c contracts/api.yaml

# With custom .env location
apistry serve -c contracts/api.yaml --env /path/to/env

# Auto-create collections
apistry serve -c contracts/api.yaml --enableAutoCollectionCreate yes

# Custom port
apistry serve -c contracts/api.yaml --port 8080
```

## Deployment

### Local Development
```bash
apistry serve -c contracts/api.yaml
```

### AWS Lambda
APIstry is Lambda-ready and can be packaged and deployed as a serverless function. The contract can be bundled with the deployment or loaded from S3.

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["apistry", "serve", "-c", "contracts/api.yaml"]
```

### Production Considerations
- Use environment variables for database connections
- Enable appropriate logging levels
- Consider using a process manager (PM2, systemd)
- Set up monitoring and alerting
- Use API Gateway for additional security, rate limiting, and routing

## Limitations & Considerations

### What APIstry Does Well
- CRUD operations on MongoDB collections
- Standard REST API patterns
- Rapid prototyping and development
- Internal APIs and tools

### What to Handle Separately
- Complex business logic - implement in event-driven services
- Multi-step transactions - use event handlers
- Advanced security - implement in API Gateway
- Custom workflows - use event consumers

APIstry is designed to be simple and focused on CRUD operations. For complex business logic, follow the CaaS pattern of keeping the API surface simple and implementing workflows in separate services that react to change events.

---

© 2025 API Tapestry. All rights reserved.

