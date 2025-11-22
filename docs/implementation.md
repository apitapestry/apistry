# APIstry - a Contract as a Service API Service implementation

## Overview

Contract as a Service is an OpenAPI-driven REST API service that provides a flexible, contract-first approach to
building and managing APIs. The service automatically generates API endpoints from OpenAPI 3.0 specifications, making it
easy to create and maintain consistent, well-documented APIs.

### Key Features

- **Contract-First Development**: Define your API using OpenAPI 3.0 specifications, and the service automatically
  creates the endpoints
- **Swagger UI Documentation**: Automatically generated interactive API documentation available at `/docs`
- **MongoDB Integration**: Built-in CRUD operations with advanced query capabilities
- **Auto-Collection Creation**: Automatically validates and creates MongoDB collections based on OpenAPI tags during
  server startup
- **Flexible Querying**: Support for operators like `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `isNull`, and wildcard
  matching
- **Bulk Operations**: Support for bulk inserts, updates, and deletes
- **Validation**: Automatic request/response validation using AJV and JSON Schema
- **Fastify-Based**: Built on the high-performance Fastify web framework
- **AWS Lambda Ready**: Can be deployed as a Lambda function or run locally
- **Response Metadata**: Optional metadata in collection responses including total count and pagination information

### Sample Contracts

APIstry includes sample OpenAPI contracts that demonstrate various features and use cases. These contracts are located
in the [`docs/samples/contracts/`](../samples/contracts/) directory:

- **[Books API](samples/contracts/books.yaml)** (`books.yaml`) - Book collection management
- **[Cars](samples/contracts/cars.v1.yaml)** (`cars.v1.yaml`) - Comprehensive vehicle inventory management with
  advanced filtering, sorting, and pagination capabilities
- **[Utils](samples/contracts/utils.v1.yaml)** (`utils.v1.yaml`) - Simple utility endpoints for health checks and
  status
- **[Videos API](samples/contracts/videos.yaml)** (`videos.yaml`) - Video collection management

These sample contracts serve as reference implementations and can be used as templates for creating your own APIs.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (local or cloud)
- npm or yarn package manager

### Installation Application

```bash
   npm install apistry
```

### Configuration

The service requires a MongoDB connection string to operate. You must provide this via an environment variable.

You can use:

```bash
  export DB_CONNECTION="your_mongodb_connection_string"
```

or ...

Create an `.env` file with the following required variable:

```env
DB_CONNECTION=mongodb://username:password@hostname:port/database_name
```

**Important Notes:**

- The connection string must include the database name at the end
- If the specified database does not exist, MongoDB will automatically create it when the service starts and creates the
  first collection

#### Examples

**Local MongoDB:**

```env
DB_CONNECTION=mongodb://localhost:27017/myDb
```

**MongoDB Atlas (Cloud):**

```env
DB_CONNECTION=mongodb+srv://username:password@cluster.mongodb.net/myDb?retryWrites=true&w=majority
```

**Local MongoDB with authentication:**

```env
DB_CONNECTION=mongodb://admin:password123@localhost:27017/myapp?authSource=admin
```

#### Optional Environment Variables

```env
LOG_LEVEL=info          # Options: debug, info, warn, error (default: info)
```

### Running the Service

Start the local development server:

```bash
apistry serve -c contracts/cars/cars.v1.yaml
or
apistry serve --contract ../../contracts/dist-wip/cars.v1.yaml --env ../..
```

The service will start on `http://localhost:3000`. You should see:

```
🚀 Server running on http://localhost:3000
📖 API Documentation: http://localhost:3000/docs
```

### Testing the API

Once the server is running, you can test the endpoints:

```bash
# Health check (if available)
curl http://localhost:3000/health

# Get all cars
curl http://localhost:3000/v1/cars

# Get cars with filters (Toyota cars under $25,000)
curl "http://localhost:3000/v1/cars?make=eq.Toyota&price=lt.25000"

# Create a new car
curl -X POST http://localhost:3000/v1/cars \
  -H "Content-Type: application/json" \
  -d '{"make": "Toyota", "model": "Camry", "year": 2023, "price": 28000}'
```

#### Postman Collection

A Postman collection is available for testing the Cars API. Import the [
`Cars.postman_collection.json`](samples/Cars.postman_collection.json) file into Postman to access pre-configured
requests for all car management endpoints including:

- GET requests with various filter examples
- POST requests for creating single and multiple cars
- PATCH requests for updating cars
- DELETE requests for removing cars

This collection provides a convenient way to test and explore the Cars API functionality without writing curl commands.

## MongoDB Collections

The service uses MongoDB tags from OpenAPI specifications to determine collection names:

- Each OpenAPI operation should have a `tags` field
- The first tag is used as the MongoDB collection name
- Example: An operation tagged with `cars` will use the `cars` collection

### Automatic Collection Creation

The server automatically validates that all required collections exist during startup.

**Note:** If the database specified in your connection string does not exist, MongoDB will automatically create it when
the first collection is created.

When starting the server, it will:

1. Scan the OpenAPI contract for all tags
2. Connect to MongoDB (creating the database if it doesn't exist)
3. Query MongoDB for existing collections
4. Identify any missing collections
5. Prompt to create them (or create automatically if configured)

**Usage:**

```bash
# Default: Prompt before creating collections
apistry serve -c contracts/cars/cars.v1.yaml

# Auto-create without prompting
apistry serve -c contracts/cars/cars.v1.yaml --enableAutoCollectionCreate yes
```

**Example output:**

```
⚠️  Missing collections detected:
   - cars
   - users

Do you want to create the missing collections? (Y/N): Y
Creating collections...
✅ Created collection: cars
✅ Created collection: users
✅ All collections created successfully
```

For detailed documentation, see [Collection Auto-Creation Guide](collection-auto-creation.md).

## Query Operators

The service supports advanced query operators for filtering:

| Operator       | Description                      | Example             |
|----------------|----------------------------------|---------------------|
| `eq.<value>`   | Equals the specified value       | `make=eq.Toyota`    |
| `neq.<value>`  | Not equal to the specified value | `status=neq.sold`   |
| `gt.<number>`  | Greater than (numeric)           | `price=gt.20000`    |
| `lt.<number>`  | Less than (numeric)              | `year=lt.2020`      |
| `gte.<number>` | Greater than or equal to         | `mileage=gte.50000` |
| `lte.<number>` | Less than or equal to            | `price=lte.30000`   |
| `isNull`       | Field is missing, empty, or null | `vin=isNull`        |
| `*` (wildcard) | Partial string matching          | `model=*Camry*`     |

## Troubleshooting

### "Missing required environment variables: DB_CONNECTION"

Make sure you have created a `.env` file in the `service` directory with a valid `DB_CONNECTION` string.

### Connection issues

- Verify your MongoDB instance is running
- Check the connection string format includes the database name
- For MongoDB Atlas, ensure your IP is whitelisted
- Verify username and password are correct

### Port already in use

If port 3000 is already in use, you have two options:

**Option 1: Start APIstry on a different port**

Use the `--port` parameter when starting the service:

```bash
apistry serve -c contracts/cars/cars.v1.yaml --port 3001
```

Or set the `PORT` environment variable:

```bash
PORT=3001 apistry serve -c contracts/cars/cars.v1.yaml
```

**Option 2: Kill the process using port 3000**

On macOS/Linux:
```bash
# Find the process ID (PID) using port 3000
lsof -i :3000

# Kill the process (replace PID with the actual process ID)
kill -9 PID
```

On Windows:
```cmd
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the actual process ID)
taskkill /PID PID /F
```

## Development

### Debug Logging

Enable debug logging to see detailed request/response information:

```env
LOG_LEVEL=debug
```

## License

Apache 2.0

## Support

For questions or issues, contact the API Governance Team at API-Gov-Team@gmail.com

