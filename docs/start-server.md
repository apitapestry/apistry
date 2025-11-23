# Start Server

Get up and running with Apistry in minutes.


## Prior Steps

1. [Install Apistry CLI](./apistry-cli.md)
2. [Install MongoDB](https://docs.mongodb.com/manual/installation/)
3. Have MongoDB connection string. 
4. OpenAPI contract (yaml) is ready. Check [OpenApi Design](openapi-design.md) page for tips.

Once the above is complete. You are ready to start Apistry server for the first time!

## Start Apistry

Start the server using the apistry CLI. All paths are relative to your current working directory.
So if you are starting the server rom the same directory as your contract file and .env file, you simply enter. 

```bash
apistry serve -c cars.v1.yaml
```

When prompted about creating the `cars` collection, enter `Y`:

```
⚠️  Missing collections detected:
   - cars

Do you want to create the missing collections? (Y/N): Y
Creating collections...
✅ Created collection: products
✅ All collections created successfully

🚀 Server running on http://localhost:3000
📖 API Documentation: http://localhost:3000/docs
```

If you want to skip the prompt and have Apistry auto-create any missing collections:

```bash
apistry serve -c cars.v1.yaml --enableAutoCollectionCreate true
```

## Step 4: Test Your API

### View Interactive Documentation
Open your browser to: `http://localhost:3000/docs`

### Create a Product
```bash
curl -X POST http://localhost:3000/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "price": 999.99,
    "description": "High-performance laptop",
    "category": "Electronics",
    "inStock": true
  }'
```

### List All Products
```bash
curl http://localhost:3000/v1/products
```

### Get a Specific Product
```bash
curl http://localhost:3000/v1/products/{id}
```

Replace `{id}` with the `_id` returned from the create or list operations.

### Filter Products
```bash
# Products under $1000
curl "http://localhost:3000/v1/products?price=lt.1000"

# Products in Electronics category
curl "http://localhost:3000/v1/products?category=eq.Electronics"

# In stock products sorted by price
curl "http://localhost:3000/v1/products?inStock=eq.true&sort=price"
```

### Update a Product
```bash
curl -X PATCH http://localhost:3000/v1/products/{id} \
  -H "Content-Type: application/json" \
  -d '{"price": 899.99}'
```

### Delete a Product
```bash
curl -X DELETE http://localhost:3000/v1/products/{id}
```

## What's Happening?

1. **Apistry reads your contract** - It parses the OpenAPI specification to understand your API structure
2. **Creates endpoints** - Each path in your contract becomes a working API endpoint
3. **Maps to MongoDB** - The `tags` array (e.g., `products`) determines which MongoDB collection to use
4. **Validates requests** - All requests are validated against your schemas
5. **Handles CRUD operations** - Create, Read, Update, Delete operations work automatically
6. **Provides documentation** - Swagger UI is generated from your contract

## Next Steps

- **Explore [Features](features.md)** - Learn about filtering, pagination, bulk operations
- **Check out [Sample Contracts](samples/contracts/)** - See more complex examples
- **Read [Implementation Guide](testing.md)** - Detailed documentation
- **Learn about [CaaS](../../caas/caas/docs/index.md)** - Understand the architecture pattern

## Common Options

### Auto-create collections without prompting
```bash
apistry serve -c my-api.yaml --enableAutoCollectionCreate yes
```

### Use a different port
```bash
apistry serve -c my-api.yaml --port 8080
```

### Specify .env file location
```bash
apistry serve -c my-api.yaml --env /path/to/env/folder
```

### Enable debug logging
```env
LOG_LEVEL=debug
```

Then start normally:
```bash
apistry serve -c my-api.yaml
```

## Troubleshooting

### MongoDB Connection Failed
- Verify your `DB_CONNECTION` string is correct
- Ensure MongoDB is running
- Check network connectivity to MongoDB

### Collection Not Found
- Use `--enableAutoCollectionCreate yes` flag
- Or create collections manually in MongoDB

### Validation Errors
- Check that your request body matches the schema in your contract
- Use the Swagger UI at `/docs` to see required fields
- Review error messages for specific validation failures

### Sample Contracts

Apistry includes sample OpenAPI contracts that demonstrate various features and use cases. These contracts are located
in the [`docs/samples/contracts/`](../samples/contracts/) directory:

- **[Books API](../samples/contracts/books.yaml)** (`books.yaml`) - Book collection management
- **[Cars](../samples/contracts/cars.v1.yaml)** (`cars.v1.yaml`) - Comprehensive vehicle inventory management with
  advanced filtering, sorting, and pagination capabilities
- **[Utils](../samples/contracts/utils.v1.yaml)** (`utils.v1.yaml`) - Simple utility endpoints for health checks and
  status
- **[Videos API](../samples/contracts/videos.yaml)** (`videos.yaml`) - Video collection management

These sample contracts serve as reference implementations and can be used as templates for creating your own APIs.

## Collection Auto-Creation Feature

When starting the Apistry server, the system now validates that all collections referenced in the OpenAPI contract exist in the MongoDB database. If collections are missing, the server can automatically create them or prompt the user for confirmation.

**How It Works**

1. **Contract Scanning**: After loading the OpenAPI contract, the server scans all operations and extracts unique tags.
2. **Collection Mapping**: Each tag corresponds to a collection name (converted to lowercase).
3. **Database Query**: The server queries MongoDB to get a list of existing collections.
4. **Validation**: Missing collections are identified and logged to the console.
5. **User Action**: Depending on the configuration:
    - If auto-creation is enabled: Collections are created automatically
    - If auto-creation is disabled: User is prompted for confirmation
    - If user declines: Server startup is cancelled

```bash
apistry serve -c path/to/contract.yaml --enableAutoCollectionCreate <value>
```

**Values:**
- `y` or `yes` - Automatically create missing collections without prompting
- `n` or `no` - Prompt the user before creating collections (default)

## Examples

### With Auto-Creation Enabled
```bash
apistry serve -c contracts/cars/cars.v1.yaml --enableAutoCollectionCreate yes
```

**Output:**
```
⚠️  Missing collections detected:
   - cars
   - users

Creating collections...
✅ Created collection: cars
✅ Created collection: users
✅ All collections created successfully

🚀 Server running on http://localhost:3000
```

### Without Auto-Creation (User Prompt)
```bash
apistry serve -c contracts/cars/cars.v1.yaml --enableAutoCollectionCreate no
```

**Output:**
```
⚠️  Missing collections detected:
   - cars
   - users

Do you want to create the missing collections? (Y/N): Y
Creating collections...
✅ Created collection: cars
✅ Created collection: users
✅ All collections created successfully

🚀 Server running on http://localhost:3000
```
**If user enters N:**
```
⚠️  Missing collections detected:
   - cars
   - users

Do you want to create the missing collections? (Y/N): N
❌ Collection creation declined. Exiting...
Server startup cancelled.
```

### When All Collections Exist
```bash
apistry serve -c contracts/cars/cars.v1.yaml
```

**Output:**
```
✅ All required collections exist in database
🚀 Server running on http://localhost:3000
```

## Technical Details

## Tag Extraction
- Tags are extracted from the `tags` array in each OpenAPI operation
- Tag names are converted to lowercase for MongoDB collection names
- Duplicate tags are automatically deduplicated

## Collection Creation
- Collections are created using MongoDB's native `createCollection()` method
- Each collection is created sequentially with confirmation logging
- If creation fails, an error is thrown and server startup is cancelled

## Configuration
The feature is controlled by the `enableAutoCollectionCreate` option:
- **Default**: `'n'` (no auto-creation, prompt user)
- **Type**: String
- **Valid values**: `'y'`, `'yes'`, `'n'`, `'no'` (case-insensitive)

---

© 2025 API Tapestry. All rights reserved.

