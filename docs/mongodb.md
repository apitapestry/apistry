# MongoDb

Apistry requires a MongoDB database for document storage and operations. Database can be Local or cloud-hosted.

**Database Compatibility:** While Apistry is designed to work with any JSON document database that supports standard
querying capabilities, the current release only supports MongoDB.

**Connection Configuration:** For security best practices, the MongoDB connection string must be provided as an
environment variable. Apistry also supports the use of `.env` files for setting environment variables.

**_Note:_** Be sure to provide the database name in your connection string. When the server is started, the database name
provided here will be created if it does not already exist.

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
Before starting the server, it's a good idea to ensure the database connection is successful.

```bash
apistry testConnection
```
or
```bash
apistry testConnection -e path/to/.env
```
The path is optional; if not provided, the system will look for file in current directory.

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
