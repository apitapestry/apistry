# Collection Auto-Creation Feature

## Overview
When starting the Apistry server, the system now validates that all collections referenced in the OpenAPI contract exist in the MongoDB database. If collections are missing, the server can automatically create them or prompt the user for confirmation.

## How It Works

1. **Contract Scanning**: After loading the OpenAPI contract, the server scans all operations and extracts unique tags.
2. **Collection Mapping**: Each tag corresponds to a collection name (converted to lowercase).
3. **Database Query**: The server queries MongoDB to get a list of existing collections.
4. **Validation**: Missing collections are identified and logged to the console.
5. **User Action**: Depending on the configuration:
   - If auto-creation is enabled: Collections are created automatically
   - If auto-creation is disabled: User is prompted for confirmation
   - If user declines: Server startup is cancelled

## Usage

### Command Line Flag

```bash
apistry serve -c path/to/contract.yaml --enableAutoCollectionCreate <value>
```

**Values:**
- `y` or `yes` - Automatically create missing collections without prompting
- `n` or `no` - Prompt the user before creating collections (default)

### Examples

#### With Auto-Creation Enabled
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

#### Without Auto-Creation (User Prompt)
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

#### When All Collections Exist
```bash
apistry serve -c contracts/cars/cars.v1.yaml
```

**Output:**
```
✅ All required collections exist in database
🚀 Server running on http://localhost:3000
```

## Technical Details

### Tag Extraction
- Tags are extracted from the `tags` array in each OpenAPI operation
- Tag names are converted to lowercase for MongoDB collection names
- Duplicate tags are automatically deduplicated

### Collection Creation
- Collections are created using MongoDB's native `createCollection()` method
- Each collection is created sequentially with confirmation logging
- If creation fails, an error is thrown and server startup is cancelled

### Configuration
The feature is controlled by the `enableAutoCollectionCreate` option:
- **Default**: `'n'` (no auto-creation, prompt user)
- **Type**: String
- **Valid values**: `'y'`, `'yes'`, `'n'`, `'no'` (case-insensitive)

## Code Structure

### Files Modified
1. **`src/apistry.mjs`** - Added CLI flag `--enableAutoCollectionCreate`
2. **`src/server/startServer.mjs`** - Integrated collection validation step

### Files Created
1. **`src/utils/collection-validation.mjs`** - Core validation and creation logic
2. **`tests/collection-validation.test.mjs`** - Unit tests for validation logic

### Key Functions

#### `extractTagsFromSpec(openapiSpec)`
Extracts unique tags from an OpenAPI specification.

**Returns:** `Set<string>` - Set of unique collection names (lowercased)

#### `getExistingCollections(dbConnection)`
Queries MongoDB to get a list of existing collections.

**Returns:** `Promise<Set<string>>` - Set of existing collection names

#### `createCollections(dbConnection, collectionNames)`
Creates specified collections in MongoDB.

**Parameters:**
- `dbConnection`: MongoDB connection string
- `collectionNames`: Array of collection names to create

#### `validateCollections(openapiSpec, dbConnection, autoCreate)`
Main validation function that orchestrates the validation and creation process.

**Parameters:**
- `openapiSpec`: OpenAPI specification object
- `dbConnection`: MongoDB connection string
- `autoCreate`: Boolean flag for auto-creation

**Returns:** `Promise<boolean>` - True if validation passed, false if user declined

## Best Practices

1. **Development**: Use `--enableAutoCollectionCreate yes` for rapid development to automatically create collections
2. **Production**: Use default behavior (prompt) to review collections before creation
3. **CI/CD**: Ensure collections are pre-created or use auto-create mode in deployment scripts
4. **Testing**: Contract files should have clear, descriptive tags that map to logical collection names

## Error Handling

- **MongoDB Connection Failure**: Server startup fails with error message
- **Collection Creation Failure**: Server startup cancelled with error details
- **Invalid Tag Format**: Tags are normalized to lowercase; no special validation required
- **Empty Contract**: If no tags found, validation is skipped with informational message

