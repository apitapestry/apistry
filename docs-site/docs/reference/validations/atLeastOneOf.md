# atLeastOneOf

Requires at least one of the listed properties to be present.

**Error Message:**

`At least one of [email, phone] must be present`

**Parameters:**

- properties: List of properties of which at least one must be present.

**Applicable To:** object

**Status Codes:** 422

**Declaration**

```yaml
x-validations:
  - function: atLeastOneOf
    parameters:
      properties: [email, phone]
```
---