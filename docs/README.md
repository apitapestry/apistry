![3dApistry-dark.png](images/3dApistry-darkblue.png)

<p style="font-size: 24px;"><strong>Contract to Service Runtime</strong> with <strong>MongoDB interaction</strong></p>

Apistry provides a generic runtime engine that turns OpenAPI 3.0 contracts into fully functional REST APIs without
writing service-specific code. It includes built-in MongoDB integration for automatic CRUD operations, advanced
querying, and request/response validation based on contract schemas.

[![CircleCI](https://img.shields.io/circleci/build/github/apitapestry/apistry/develop)](https://circleci.com/gh/tapestry/apistry) 
[![npm Downloads](https://img.shields.io/npm/dw/tapestry/apistry?color=blue)]
(https://www.npmjs.com/package/apistry)

- **OpenAPI Contract**: Define your API using OpenAPI 3.0 specifications, and the service automatically creates functional endpoints
- **Swagger UI Documentation**: Automatically generated interactive API documentation available at `/docs`
- **Auto-Collection Creation**: Automatically validates and creates MongoDB database and collections based on OpenAPI
  tags during server startup
- **MongoDB Integration**: Built-in CRUD operations with advanced query capabilities
- **Flexible Querying**: Support for operators like `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `isNull`, and wildcard
  matching
- **Bulk Operations**: Support for bulk inserts, updates, and deletes
- **Response List Handling**: Optional metadata in responses including total count and pagination information
- **Validation**: Automatic parameter, request/response validation using AJV and JSON Schema
- **Fastify-Based**: Built on the high-performance Fastify web framework
  [//]: # (- **AWS Lambda Ready**: Can be deployed as a Lambda function or run locally)

## Overview

- [🧰 Installation](#installation)
- [💻 Usage](#usage)
- [📖 Documentation](#documentation)

[//]: # (- [⚙️ Integrations]&#40;#️-integrations&#41;)
[//]: # (- [👏 Contributing]&#40;#contributing&#41;)

## 🧰 Installation

- The easiest way to install Apistry is to use either [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/):

```bash
npm install -g apistry
```

Or [yarn](https://yarnpkg.com/):

```
yarn global add apistry
```

## 💻 Usage

### 1. OpenApi contract

Apistry, being a contract based service, **needs a well-defined contract** to startup. 
The following examples have been provided to get you started quickly:

- **[Books](assets/contracts/books.v1.yaml)** (`books.v1.yaml`)
- **[Cars](assets/contracts/cars.v1.yaml)** (`cars.v1.yaml`) - Has most sample endpoints and features
- **[Utils](assets/contracts/utils.v1.yaml)** (`utils.v1.yaml`) - Simple utility endpoints for health checks and ???
- **[Videos](assets/contracts/videos.v1.yaml)** (`videos.v1.yaml`)
- **[Pets](assets/contracts/pets.v1.yaml)** (`pets.v1.yaml`)
- **[Notes](assets/contracts/notes.v1.yaml)** (`notes.v1.yaml`) - A Polymorphic example

Download one or all of these to get started quickly or create your own.

For reference - let's assume you are downloading these into the **`~/contracts directory`**.

**Note:** All files mentioned in this quick start can be downloaded as a **[single zip](assets/contracts.zip)** 
including the contracts, database files, sampleData.

### 2. Database Setup

Apistry comes packaged with an in memory, filesystem backed DB that is similar to MongoDB. 

**Database Compatibility:** Apistry is designed to work with any JSON document database. MongoDB is already 
supported, but building out adapters for other databases is straightforward. Please reach out if you have a need for 
a specific database.

A paid license is required for production use of database adapters beyond the provided in-memory database.

**Connection Configuration:** For security best practices, database connection strings must be provided as an 
environment variable. Apistry also supports `.env` files for local development environments.

**Note:** If no database connection string is provided, Apistry will default to writing the database files to the
{current working directory}/nedb. It is best to be explicit about the location of the database files via the 
DB_CONNECTION environment variable or **`.env`** file. 

Environment variable example:
```bash
export DB_CONNECTION="nedb:///~/contracts/nedb"
```

Or create an `.env` file:
```env
DB_CONNECTION=nedb:///~/contracts/nedb
```

**Notes:** 

1. The system will look for the `.env` file in the current working directory
2. Providing a run option of --env with a path will override the default
3. The paths above can be absolute or relative to the current working directory. Notice above there are 3 slashes
`nedb:///~/contracts/nedb` - this indicates an absolute path. A relative path would look like `nedb://data/nedb` (2 slashes).
4. If you have downloaded the zip and expanded it - your database files already exist and have been populated. 

Example directory structure:
```
~/contracts
│ ├── cars.v1.yaml
│ ├── books.v1.yaml
│ ├── pets.v1.yaml
│ ├── utils.v1.yaml
│ ├── videos.v1.yaml
│ ├── notes.yaml
│ ├── .env
│ ├── sampleData/            ← Example data files for import
│ │ ├── books.csv
│ │ ├── cars.json
│ │ ├── notes.json
│ │ └── videos.csv
│ └── nedb/                  ← Database files will be stored here
```

### 2. Load Data
Before starting apistry service, you might want to load some example data into your database collections.

You can skip this step if you have already downloaded the zip file above as the database files are already populated.

Example Data:

- **[Books - books.csv](assets/contracts/sampleData/books.csv)**
- **[Books - books.csv](assets/contracts/books.csv)**
- **[Cars - cars.json](assets/contracts/sampleData/cars.json)**
- **[Notes - notes.json](assets/contracts/sampleData/notes.json)**
- **[Videos - videos.csv](assets/contracts/sampleData/videos.csv)**

Download to **`~/contracts/sampleData`** directory. 

To import data into the database collections, use the `import` command:
```bash
cd ~/contracts
apistry import -i sampleData -r true
```
This will read the files, determine the collection names based on the file names, and import the data into the database.

The `-r true` option indicates that existing data in the collections will be removed before importing the new data 
(load replace).

**Output:**
```bash
apistry import -i sampleData -r true
📁 Loading files from: /Users/myuser/contracts/sampleData
📍 DB: nedb://data/nedb
⏳ Connecting to database…
📦 Processing books.csv → collection "books"
  ✅ Inserted 308 records
📦 Processing cars.json → collection "cars"
  ✅ Inserted 10 records
📦 Processing notes.json → collection "notes"
  ✅ Inserted 20 records
📦 Processing videos.csv → collection "videos"
  ✅ Inserted 3890 records
🎉 Import summary:
 - books: deleted: 308, inserted: 308 (from books.csv)
 - cars: deleted: 14, inserted: 10 (from cars.json)
 - notes: deleted: 20, inserted: 20 (from notes.json)
 - videos: deleted: 3890, inserted: 3890 (from videos.csv)

Process finished with exit code 0
```

Additional options are available:
```bash
apistry --help
apistry import --help
apistry export --help
apistry serve --help
```

### 3. Start the Server
Starting the server is very fast and easy. 

To start with only 1 contract specify the path to the contract file:

```bash
cd ~/contracts
apistry serve -c ./cars.v1.yaml
or 
apistry serve -e ~/contracts/.env --contract ~/contracts/cars.v1.yaml
```

**Output:**
```
🛢 Database connected! (nedb://data/nedb)
📄 Loaded 6 contract(s).
   --contractsDir: contracts/dist [
  'books.v1.yaml',
  'cars.v1.yaml',
  'notes.yaml',
  'pets.v1.yaml',
  'utils.v1.yaml',
  'videos.v1.yaml'
]
✅  Loaded 40 routes!
Server listening at http://[::1]:3000
Server listening at http://127.0.0.1:3000
🚀 Server running on http://localhost:3000
📖 API Documentation: http://localhost:3000/docs
```

### 4. Make API Calls

Now you can make requests of your api using any REST client - including your browser for get calls. Here are some 
example endpoints: 
- Get all cars: `GET http://localhost:3000/v1/cars`
- Get a car by id: `GET http://localhost:3000/v1/cars/{id}`
- Create a new car: `POST http://localhost:3000/v1/cars`
- Update a car: `http://localhost:3000/v1/cars`

Curl examples:
```bash
# Get all cars
curl -X GET "http://localhost:3000/v1/cars" -H "accept: application/json"
```

## 📖 Documentation

- [Documentation](https://www.apitapestry.net/apistry/overview.md)
    - [Getting Started](https://www.apitapestry.net/apistry/concepts.md) - The basics of Apistry.

Once you've had a look through the getting started material, some of these guides can help you become a power user.

- [Using the command-line interface](https://www.apitapestry.net/apistry/overview.md/apistrycli.md) - Quickest way 
  to get going with Apistry is in the CLI.

## ℹ️ Support

If you need help using Apistry or have any questions, you can use [GitHub Discussions](https://github.com/apitapestry/apistry/discussions)

If you have a bug or feature request, [create an issue for it](https://github.com/apitapestry/apistry/issues).

[//]: # (## 👏 Contributing)

[//]: # ()
[//]: # (If you are interested in contributing to Apistry, check out [CONTRIBUTING.md]&#40;CONTRIBUTING.md&#41;.)

[//]: # ()
[//]: # (## 🎉 Thanks)

[//]: # ()
[//]: # (- [Jim Usher]&#40;https://github.com/usherj&#41; Project Founder)

## 📜 License

Apistry is 100% free and open-source, under [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt).
