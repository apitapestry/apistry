# Installation

## Prerequisites

- Node.js v18 or higher
- MongoDB instance (local or cloud)
- npm or yarn package manager

## Installation

- The easiest way to install Apistry is to use either [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/):

```bash
npm install -g apistry
```

Or [yarn](https://yarnpkg.com/):

```
yarn global add apistry
```

## CLI Usage
CLI provides several commands to manage and run Apistry. Help is available at the CLI level as well as for each command.

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
<br><br>

