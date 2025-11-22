# APIstry

<p style="font-size: 24px;"><strong>Contract to Service Runtime</strong> with <strong>MongoDB interaction</strong></p>

APIstry provides a generic runtime engine that turns OpenAPI 3.0 contracts into fully functional REST APIs without
writing service-specific code. It includes built-in MongoDB integration for automatic CRUD operations, advanced
querying, and request/response validation based on contract schemas.

[![CircleCI](https://img.shields.io/circleci/build/github/apitapestry/apistry/develop)](https://circleci.com/gh/tapestry/apistry) 
[![npm Downloads](https://img.shields.io/npm/dw/tapestry/apistry?color=blue)]
(https://www.npmjs.com/package/apistry)

- **Contract-ONLY Development**: Define your API using OpenAPI 3.0 specifications, and the service automatically
  creates functional endpoints
- **Swagger UI Documentation**: Automatically generated interactive API documentation available at `/docs`
- **Auto-Collection Creation**: Automatically validates and creates MongoDB database and collections based on OpenAPI
  tags during server startup
- **MongoDB Integration**: Built-in CRUD operations with advanced query capabilities
- **Flexible Querying**: Support for operators like `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `isNull`, and wildcard
  matching
- **Bulk Operations**: Support for bulk inserts, updates, and deletes
- **Validation**: Automatic request/response validation using AJV and JSON Schema
- **Fastify-Based**: Built on the high-performance Fastify web framework
- **Response Arrays**: Optional metadata in responses including total count and pagination information
  [//]: # (- **AWS Lambda Ready**: Can be deployed as a Lambda function or run locally)

# Overview

- [🧰 Installation](#-installation)
- [💻 Usage](#-usage)
- [📖 Documentation](#-documentation)
- [⚙️ Integrations](#️-integrations)
- [👏 Contributing](#-contributing)

## 🧰 Installation

- The easiest way to install APIstry is to use either [npm](https://www.npmjs.com/):

```bash
npm install -g apistry
```

Or [yarn](https://yarnpkg.com/):

```
yarn global add apistry
```

## 💻 Usage

### 1. Create an OpenApi contract

APIstry, being a contract based service, **needs a well-defined contract** to startup. 
The following examples have been provided to get you started quickly:

- **[Books API](samples/contracts/books.yaml)** (`books.yaml`)
- **[Cars](samples/contracts/cars.v1.yaml)** (`cars.v1.yaml`)
- **[Utils](samples/contracts/utils.v1.yaml)** (`utils.v1.yaml`) - Simple utility endpoints for health checks and
  status
- **[Videos API](samples/contracts/videos.yaml)** (`videos.yaml`)

Download one or all of these to get started quickly or create your own. 

### 2. MongoDB Setup

APIstry requires a MongoDB database for document storage and operations. Both local and cloud-hosted MongoDB instances 
are supported.

**Database Compatibility:** While APIstry is designed to work with any JSON document database that supports standard 
querying capabilities, the current release provides native integration exclusively with MongoDB.

**Connection Configuration:** For security best practices, the MongoDB connection string must be provided as an 
environment variable. APIstry supports `.env` files for local development environments.

**Note:** Be sure to provide the database name in your connection string. When started, database and collection 
will be created if they do not already exist.

Hosted MongoDB Example:
```bash
export DB_CONNECTION="mongodb+srv://myserver:****@myserver-db.ojsguxa.mongodb.net/mydb?appName=myserver-db"
```

Local MongoDB Example:
```bash
export DB_CONNECTION="mongodb://localhost:27017/mydb"
```

Or create an `.env` file:
```env
DB_CONNECTION=mongodb+srv://myserver:****@myserver-db.ojsguxa.mongodb.net/mydb?appName=myserver-db
```

### 2. Confirm Database Connection
Before starting the server, it's a good idea to test the database connection to your DB_CONNECTION is correct.

All paths are relative to the current working directory.

```bash
apistry testConnection
```
or
```bash
apistry testConnection -e path/to/.env
```

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

Additional options are available:
```bash
apistry --help
```

**Output:**
```bash
Usage: apistry [options] [command]

Apistry CLI

Options:
-V, --version              output the version number
-h, --help                 display help for command

Commands:
serve [options]            Start the API development server
testConnection [options]   Test the MongoDB database connection (uses DB_CONNECTION env var)
clearCollection [options]  Clear all documents from a MongoDB collection
help [command]             display help for command
```

### 3. Start the Server
Starting the server is very fast and easy. 
All files and paths are relative to the current working directory.

Just provide the path to your OpenAPI contract file:

```bash
apistry serve -c contracts/cars.v1.yaml
```

If using an environment file, provide the path to the directory containing the `.env` file:
```bash
apistry serve -e contracts/.env -c contracts/cars.v1.yaml
```

**Output:**
```
✅ All required collections exist in database
🚀 Server running on http://localhost:3000
```

## 📖 Documentation

- [Documentation](https://www.apitapestry.net/apistry/overview.md)
    - [Getting Started](https://www.apitapestry.net/apistry/concepts.md) - The basics of APIstry.

Once you've had a look through the getting started material, some of these guides can help you become a power user.

- [Using the command-line interface](https://www.apitapestry.net/apistry/overview.md/apistrycli.md) - Quickest way 
  to get going with APIstry is in the CLI.

## ℹ️ Support

If you need help using APIstry or have any questions, you can use [GitHub Discussions](https://github.com/apitapestry/apistry/discussions)

If you have a bug or feature request, [create an issue for it](https://github.com/apitapestry/apistry/issues).

[//]: # (## 👏 Contributing)

[//]: # ()
[//]: # (If you are interested in contributing to APIstry, check out [CONTRIBUTING.md]&#40;CONTRIBUTING.md&#41;.)

[//]: # ()
[//]: # (## 🎉 Thanks)

[//]: # ()
[//]: # (- [Jim Usher]&#40;https://github.com/usherj&#41; Project Founder)

## 📜 License

APIstry is 100% free and open-source, under [Apache License 2.0](LICENSE).
