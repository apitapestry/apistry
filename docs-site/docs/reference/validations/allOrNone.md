# allOrNone

Requires either all or none of the listed properties to be present.

**Error Message:**

`Either all of [city, state, zip] must be present or none`

**Parameters:**

- properties: List of properties that must be all present or all absent.

**Applicable To:** object

**Status Codes:** 422

**Declaration**

```yaml
x-validations:
  - function: allOrNone
    parameters:
      properties: [city, state, zip]
```
---