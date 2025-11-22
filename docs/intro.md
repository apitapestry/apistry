# Introduction

> **⚠️ Note:** This page contains early draft content that has been superseded by the reorganized documentation. 
> Please see:
> - [Overview](getting-started/overview.md) for a high-level introduction
> - [Core Concepts](getting-started/core-concept.md) for the fundamental ideas behind CaaS
> - [Business Logic](design-guide/business-logic.md) for patterns on handling business logic
> - [Contract Design](design-guide/contract-design.md) for design guidelines

---

If designed properly, an openapi contract can contain all of the needed information to deploy a fully functional API without writing any code.
If this were possible the time from concept to deployment could be reduced from weeks/months to minutes. Ongoing 
maintenance costs would be reduced significantly as well since there would be no code to maintain, only the contract definition.

Is this a fantasy? No it is possible today. The biggest challenge is changing developers and leaders mindset to impplement
this new design pattern. 

Some code would be needed, but this could be written once and reused for all deployments. The code would be a single 
runtime engine that reads the contract and provides the needed functionality. All of the code would be agnostic of what
contract it is executing. This way the code would focus on cross-cutting concerns like security, logging, monitoring, 
database, change events, etc.

Of course there would still be a need for business logic. Let's review this:

1. **GET** operations - There should be no business logic - just retrieve the data with filters.
2. **POST/PUT/PATCH** - Possible to have some pre-processing business validations. Some post-processing logic is typical.  
3. **DELETE** - no business logic needed - Perhaps the DELETE is a soft delete - updating some status.

## DELETE

There could be a simple extension that indicates if the DELETE is a soft delete. If so the runtime engine would
update a status property instead of deleting the record. 

Example:

```yaml
paths:
  /pets/{petId}:
    delete:
      x-soft-delete:
        property: petStatus
        value: inactive
```

Note: DELETE would also need to indicate which property to exclude when returning a query.

## Pre-Processing - POST/PUT/PATCH

**pre-processing** business validations would need to be handled by the runtime engine. This could be done by
having a list of functions to call for each operation defined in the contract.

For example:

```yaml
paths:
  /pets:
    post:
      x-validations:
        - validateAddress
        - validateBirthDate
```

These could be placed within the operation, schema or property level.

## Post-Processing - POST/PUT/PATCH

The **post-processing** logic could be implemented as a separate service that listens to and processes change events.
This is where the mindset change is needed. Instead of creating an API that does everything, the API would be a simple CRUD interface
with limited business logic. Then developers would focus all of the efforts on creating services that process the change events.
Thus creating a clean separation of concerns between the API and the business logic.

## Proxy/Transform

Another useful feature would be the ability to define proxy/transform operations within the contract. This would
allow data to be retrieved from external services and mapped into the defined model. This would be useful for 
integrating legacy systems or third-party services.

## Conclusion

What I am proposing is NOT contract-first development (generating code from a contract). What I am proposing is 
**Contract-as-a-Service (CaaS)** - a runtime engine that interprets the contract and provides a fully functional API without 
writing any code. This would not eliminate the need for code, but it would significantly reduce the amount of effort
required to deploy and maintain APIs. Reducing time and therefore cost to the organization. 

Similar handling could be done for event streaming - Keep for another later project.

This would require organizations to utilize mature API design practices including contract validation (linting), manual 
review and gateway usage. But the benefits would be significant.