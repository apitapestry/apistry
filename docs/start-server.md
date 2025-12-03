# Start Server

Get up and running with Apistry in minutes.

## Prior Steps

1. [Install Apistry](./apistry-cli.md)
2. [Install MongoDB](https://docs.mongodb.com/manual/installation/)
3. Have [MongoDB connection](mongodb.md) as environment variable.
4. Use the cars.v1.yaml contract.<br>
   When ready to craft your own, check [OpenApi Design](openapi-design.md) page for tips. Example contract
   provided here: [Cars API](assets/contracts/cars.v1.yaml)

Once the above is complete. You are ready to start Apistry server for the first time!

## Start Apistry

Start the server using the apistry CLI. All paths are relative to your current working directory.
Assuming the following;

You have a directory that contains the following files:

- You are in that directory
- `cars.v1.yaml` - OpenAPI contract file
- `.env` - Environment file with MongoDB connection string

You start the server simply using.

```bash
apistry serve -c cars.v1.yaml
```

When prompted about creating the `cars` collection, enter `Y`:

```
⚠️  Missing collections detected:
   - cars

Do you want to create the missing collections? (Y/N): Y
Creating collections...
✅ Created collection: cars
✅ All collections created successfully

🚀 Server running on http://localhost:3000
📖 API Documentation: http://localhost:3000/docs
```

Your service is now running! That is it, it is ready to accept requests.

## Provided Endpoints
Use your browser or Postman to explore the following endpoints:

- `http://localhost:3000/docs` - Swagger UI<br>
- `http://localhost:3000/health` - Health Check Endpoint

## What's Happening?

1. **Apistry reads your contract** - It parses the OpenAPI specification to understand your API structure
2. **Provides documentation** - Swagger UI is generated from your contract - you could use this to interact with
   your API
3. **Creates endpoints** - Each path in your contract becomes a working API endpoint
4. **Handles CRUD operations** - Create, Read, Update, Delete operations work automatically
5. **Maps to MongoDB** - The `tags` array (e.g., `cars`) determines which MongoDB collection to use
6. **Validates parameters/requests** - All requests are validated against your schemas
7. **Validates responses** - All properties in response must exist in schema - any extra properties are stripped out

## Troubleshooting

**MongoDB Connection Failed**

- Verify your `DB_CONNECTION` string is correct
- Ensure MongoDB is running
- Check network connectivity to MongoDB

**Validation Errors**

- Check that your request body matches the schema in your contract
- Use the Swagger UI at `/docs` to see required fields
- Review error messages for specific validation failures

## Sample Contracts

Apistry includes sample OpenAPI contracts that demonstrate various features and use cases.

- **[Books API](assets/contracts/books.v1.yaml)** (`books.v1.yaml`) - Book collection management
- **[Cars](assets/contracts/cars.v1.yaml)** (`cars.v1.yaml`) - Comprehensive vehicle inventory management with advanced filtering, sorting, and pagination capabilities
- **[Utils](assets/contracts/utils.v1.yaml)** (`utils.v1.yaml`) - Simple utility endpoints for health checks and status
- **[Videos API](assets/contracts/videos.v1.yaml)** (`videos.v1.yaml`) - Video collection management

These sample contracts serve as reference implementations and can be used as templates for creating your own APIs.

## Auto Collection Create

When starting the Apistry server, the system validates that all collections referenced in the OpenAPI contract exist
in the MongoDB database. If collections are missing, the server will automatically create them after prompting the user.

```bash
apistry serve -c path/to/contract.yaml --enableAutoCollectionCreate <value>
```

**Output:**

```
⚠️  Missing collections detected:
   - cars

Creating collections...
✅ Created collection: cars
✅ All collections created successfully
🚀 Server running on http://localhost:3000
```
