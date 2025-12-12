# Testing the API
Now that you have your Apistry running you can use it to add, query, delete and update to your new API. It is that 
easy!  

## Testing using the Cars API

**Create Cars**
```bash
curl -X POST http://localhost:3000/v1/cars \
  -H "Content-Type: application/json" \
  -d '{
    "vin": "1HGCM82633A004352",
    "make": "Honda",
    "model": "Accord",
    "year": 2021,
    "color": "Blue",
    "mileage": 15300,
    "price": 21950,
    "status": "available",
    "bodyType": "sedan",
    "transmission": "automatic",
    "fuelType": "gasoline",
    "engine": "2.0L Turbo 4-Cylinder",
    "driveType": "fwd",
    "doors": 4,
    "seats": 5,
    "features": ["Backup Camera", "Bluetooth", "Heated Seats"],
    "description": "Low-mileage, single owner, well maintained.",
    "images": ["https://example.com/images/honda-accord-2021-1.jpg"]
  }'

curl -X POST http://localhost:3000/v1/cars \
  -H "Content-Type: application/json" \
  -d '{
    "vin": "2T1BURHE5JC123456",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2018,
    "color": "White",
    "mileage": 48200,
    "price": 15999,
    "status": "available",
    "bodyType": "sedan",
    "transmission": "cvt",
    "fuelType": "hybrid",
    "engine": "1.8L 4-Cylinder Hybrid",
    "driveType": "fwd",
    "doors": 4,
    "seats": 5,
    "features": ["Adaptive Cruise Control", "Lane Departure Warning"],
    "description": "Certified pre-owned, excellent fuel economy.",
    "images": ["https://example.com/images/toyota-corolla-2018-1.jpg"]
  }'

curl -X POST http://localhost:3000/v1/cars \
  -H "Content-Type: application/json" \
  -d '{
    "vin": "3FA6P0D92HR123789",
    "make": "Ford",
    "model": "Fusion",
    "year": 2017,
    "color": "Red",
    "mileage": 60500,
    "price": 13450,
    "status": "available",
    "bodyType": "sedan",
    "transmission": "automatic",
    "fuelType": "gasoline",
    "engine": "2.5L 4-Cylinder",
    "driveType": "awd",
    "doors": 4,
    "seats": 5,
    "features": ["Remote Start", "Navigation System"],
    "description": "All-wheel drive, new tires, clean interior.",
    "images": ["https://example.com/images/ford-fusion-2017-1.jpg"]
  }'
```

**List Cars**

```bash
curl http://localhost:3000/v1/cars
```

**Get a Specific Car**

```bash
curl http://localhost:3000/v1/cars/{id}
```

**Search Cars**

```bash
# 1. Find all available sedans under $20,000, sorted by year (newest first)
curl "http://localhost:3000/v1/cars?status=eq.available&bodyType=eq.sedan&price=lt.20000&sort=-year"

# 2. Get all hybrid cars with mileage under 50,000 miles
toyota_hybrid="2T1BURHE5JC123456"
curl "http://localhost:3000/v1/cars?fuelType=eq.hybrid&mileage=lt.50000"

# 3. List all cars with Bluetooth feature and AWD drive type
curl "http://localhost:3000/v1/cars?features=cs.Bluetooth&driveType=eq.awd"

# 4. Get all cars manufactured after 2016 with at least 5 seats
curl "http://localhost:3000/v1/cars?year=gt.2016&seats=gte.5"

# 5. Find all cars with price between $13,000 and $22,000
curl "http://localhost:3000/v1/cars?price=gte.13000&price=lte.22000"

# 6. Get all cars with Remote Start or Navigation System features
curl "http://localhost:3000/v1/cars?features=cs.Remote%20Start&features=cs.Navigation%20System"

# 7. List all cars sorted by mileage (lowest first)
curl "http://localhost:3000/v1/cars?sort=mileage"
```

**Update a Car**

```bash
curl -X PATCH http://localhost:3000/v1/cars/{id} \
  -H "Content-Type: application/json" \
  -d '{"price": 899.99}'
```

**Delete a Car**

```bash
curl -X DELETE http://localhost:3000/v1/cars/{id}
```

## Postman Collection

A Postman collection is provided for testing the Cars API. Import the [`Cars.postman_collection.json`](assets/contracts/Cars.postman_collection.json) file into 
Postman to access pre-configured requests for all car management endpoints including:

- GET requests with various filter examples
- POST requests for creating single and multiple cars
- PATCH requests for updating cars
- DELETE requests for removing cars

This collection provides a convenient way to test and explore the Cars API functionality without writing curl commands.

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

## Connection issues

- Verify your MongoDB instance is running
- Check the connection string format includes the database name
- For MongoDB Atlas, ensure your IP is whitelisted
- Verify username and password are correct
