# APIstry Overview

## What is APIstry?

APIstry is a production-ready implementation of the **Contract as a Service (CaaS)** architecture pattern. It's a runtime engine that reads OpenAPI 3.0 specifications and automatically provides fully functional REST API endpoints without requiring you to write service-specific code.

## Key Features

### Contract-Driven Execution
- Define your API using OpenAPI 3.0 specifications
- The service automatically creates endpoints based on your contract
- No code generation - the runtime interprets the contract directly

### MongoDB Integration
- Built-in CRUD operations (Create, Read, Update, Delete)
- Advanced query capabilities with operators: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `isNull`
- Wildcard matching support
- Bulk operations (insert, update, delete)
- Automatic collection creation during startup

### Validation & Documentation
- Automatic request/response validation using AJV and JSON Schema
- Swagger UI documentation automatically generated at `/docs`
- Response metadata including total count and pagination information

### Performance & Deployment
- Built on high-performance Fastify web framework
- AWS Lambda ready - can be deployed as a serverless function
- Can run locally for development
- Configurable logging levels

## How It Works

1. **Define your API contract** - Create an OpenAPI 3.0 specification describing your resources and operations
2. **Start APIstry** - Point APIstry at your contract file
3. **Use your API** - Endpoints are automatically available based on your contract

```bash
# Install APIstry
npm install apistry

# Start with a contract
apistry serve -c contracts/myapi.yaml

# Your API is now running!
# http://localhost:3000
```

## Architecture

APIstry implements the CaaS pattern where:

- **Contracts** define resources, operations, and schemas
- **Runtime (APIstry)** executes the contract, providing CRUD operations, validation, and event handling
- **MongoDB** stores the data
- **Business Logic** can live in event-driven services that react to changes

This separation keeps your API surface clean and consistent while allowing complex business logic to evolve independently.

## Sample Contracts

APIstry includes several sample contracts demonstrating various features:

- **Books API** - Book collection management
- **Cars API** - Vehicle inventory with filtering, sorting, and pagination
- **Utils API** - Health checks and status endpoints
- **Videos API** - Video collection management

These samples are located in `docs/samples/contracts/` and serve as templates for your own APIs.

## Use Cases

APIstry is ideal for:

- **Rapid API Development** - Go from concept to working API in minutes
- **CRUD-Heavy Applications** - Data management applications with standard create/read/update/delete patterns
- **Prototyping** - Quickly validate API designs before investing in custom implementation
- **Internal APIs** - Backend services for internal tools and dashboards
- **Event-Driven Architectures** - Simple CRUD surface with business logic in event consumers

## What's Next?

- [Getting Started Guide](implementation.md) - Installation, configuration, and first steps
- [Collection Auto-Creation](collection-auto-creation.md) - Learn about MongoDB collection management
- [Sample Contracts](samples/contracts/) - Explore working examples

## About Contract as a Service

APIstry implements the Contract as a Service architecture pattern. To learn more about CaaS concepts, design patterns, and best practices, see the [CaaS Documentation](../../caas/caas/docs/index.md).

---

© 2025 API Tapestry. All rights reserved.

