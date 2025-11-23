# Placeholder

Temporary placeholder for reference documentation section. Replace with actual reference content.

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

