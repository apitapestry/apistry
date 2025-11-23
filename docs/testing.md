# Testing
Now that you have your Apistry running you can use it to add, query, delete and update to your new API. It is that 
easy!  

## Testing the API

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

## Postman Collection

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

## Automatic Collection Creation

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

## "Missing required environment variables: DB_CONNECTION"

Make sure you have created a `.env` file in the `service` directory with a valid `DB_CONNECTION` string.

## Connection issues

- Verify your MongoDB instance is running
- Check the connection string format includes the database name
- For MongoDB Atlas, ensure your IP is whitelisted
- Verify username and password are correct

## Port already in use

If port 3000 is already in use, you have two options:

**Option 1: Start Apistry on a different port**

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

## Debug Logging

Enable debug logging to see detailed request/response information:

```env
LOG_LEVEL=debug
```

## License

Apache 2.0

## Support

For questions or issues, contact the API Governance Team at API-Gov-Team@gmail.com

