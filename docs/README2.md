---
class: landing-bg
---

<div id="homepage-hero"></div>
# **APIstry**
<br>
## A Contract as a Service Runtime Implementation

<br>

APIstry is a production-ready implementation of the Contract as a Service (CaaS) architecture pattern. It's an OpenAPI-driven REST API service that automatically generates fully functional API endpoints from OpenAPI 3.0 specifications.

### What is APIstry?

APIstry is a **runtime engine** that reads OpenAPI contracts and turns them into working APIs without writing service-specific code. Built on Node.js and Fastify, it provides:

- **Contract-driven execution** - Deploy APIs by publishing contracts, not writing code
- **MongoDB integration** - Built-in CRUD operations with advanced query capabilities
- **Auto-validation** - Automatic request/response validation using the contract schemas
- **High performance** - Built on the Fastify web framework
- **Production ready** - Includes logging, monitoring, and can be deployed to AWS Lambda

### Quick Start

```bash
# Install
npm install apistry

# Run with a contract
apistry serve -c path/to/contract.yaml
```

### Learn More

- [Getting Started Guide](implementation.md) - Installation, configuration, and usage
- [Collection Auto-Creation](collection-auto-creation.md) - MongoDB collection management
- [Sample Contracts](samples/contracts/) - Example OpenAPI contracts

### About CaaS

To learn about the Contract as a Service architecture pattern that APIstry implements, see the [CaaS documentation](../../caas/caas/docs/index.md).

<br><br>
<br><br>
<footer>  
© 2025 API Tapestry. All rights reserved.  
</footer>
