# Quick Start Guide

Get up and running with APIstry in minutes.

## Prerequisites

- Node.js v18 or higher
- MongoDB instance (local or cloud)
- npm or yarn package manager

## Installation

```bash
npm install -g apistry
```

Or for a local project:

```bash
npm install apistry
```

## Step 1: Set Up MongoDB Connection

Create a `.env` file or set an environment variable:

```bash
export DB_CONNECTION="mongodb://localhost:27017/mydb"
```

Or create `.env`:
```env
DB_CONNECTION=mongodb://localhost:27017/mydb
```

## Step 2: Create Your First Contract

Create a file `my-api.yaml`:

```yaml
openapi: 3.0.0
info:
  title: My First API
  version: 1.0.0

paths:
  /v1/products:
    get:
      summary: List all products
      tags:
        - products
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
    
    post:
      summary: Create a product
      tags:
        - products
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'
      responses:
        '201':
          description: Product created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'

  /v1/products/{id}:
    get:
      summary: Get a product by ID
      tags:
        - products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
    
    patch:
      summary: Update a product
      tags:
        - products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'
      responses:
        '200':
          description: Product updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
    
    delete:
      summary: Delete a product
      tags:
        - products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Product deleted

components:
  schemas:
    Product:
      type: object
      required:
        - name
        - price
      properties:
        _id:
          type: string
          description: MongoDB generated ID
        name:
          type: string
          description: Product name
        price:
          type: number
          description: Product price
        description:
          type: string
          description: Product description
        category:
          type: string
          description: Product category
        inStock:
          type: boolean
          description: Whether product is in stock
          default: true
```

## Step 3: Start APIstry

```bash
apistry serve -c my-api.yaml
```

When prompted about creating the `products` collection, enter `Y`:

```
⚠️  Missing collections detected:
   - products

Do you want to create the missing collections? (Y/N): Y
Creating collections...
✅ Created collection: products
✅ All collections created successfully

🚀 Server running on http://localhost:3000
📖 API Documentation: http://localhost:3000/docs
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

1. **APIstry reads your contract** - It parses the OpenAPI specification to understand your API structure
2. **Creates endpoints** - Each path in your contract becomes a working API endpoint
3. **Maps to MongoDB** - The `tags` array (e.g., `products`) determines which MongoDB collection to use
4. **Validates requests** - All requests are validated against your schemas
5. **Handles CRUD operations** - Create, Read, Update, Delete operations work automatically
6. **Provides documentation** - Swagger UI is generated from your contract

## Next Steps

- **Explore [Features](features.md)** - Learn about filtering, pagination, bulk operations
- **Check out [Sample Contracts](samples/contracts/)** - See more complex examples
- **Read [Implementation Guide](implementation.md)** - Detailed documentation
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

---

© 2025 API Tapestry. All rights reserved.

