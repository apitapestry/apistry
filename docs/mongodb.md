# MongoDb

Apistry requires a MongoDB database for document storage and operations. Both local and cloud-hosted MongoDB instances
are supported.

**Database Compatibility:** While Apistry is designed to work with any JSON document database that supports standard
querying capabilities, the current release provides native integration exclusively with MongoDB.

**Connection Configuration:** For security best practices, the MongoDB connection string must be provided as an
environment variable. Apistry supports `.env` files for local development environments.

**_Note:_** Be sure to provide the database name in your connection string. When started, database and collection
will be created if they do not already exist.

## Connection String
Hosted MongoDB Example:
```bash
export DB_CONNECTION="mongodb+srv://myserver:****@myserver-db.ojsguxa.mongodb.net/mydb?appName=myserver-db"
```

Local MongoDB Example:
```bash
export DB_CONNECTION="mongodb://localhost:27017/mydb"
```

Or create an `.env` file containing:

```env
DB_CONNECTION=mongodb+srv://myserver:****@myserver-db.ojsguxa.mongodb.net/mydb?appName=myserver-db
```

## Test Connection
Before starting the server, it's a good idea to test the database connection to your DB_CONNECTION is correct.

```bash
apistry testConnection
```
or
```bash
apistry testConnection -e path/to/.env
```
The path is optional; if not provided, the current directory is used.

**Output:**
```bash
🔍 Testing MongoDB connection...
📍 Connection string: mongodb+srv://myserver:****@myserver-db.ojsguxa.mongodb.net/mydb?appName=myserver-db
⏳ Connecting to MongoDB...
✅ Success! You are connected to MongoDB!
📊 Pinged your deployment successfully.
📂 Database name: apistry
🔌 Connection closed.
```

<br><br>