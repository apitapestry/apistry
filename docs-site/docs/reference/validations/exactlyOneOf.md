# exactlyOneOf

Requires exactly one of the listed properties to be present.

**Error Message:**

`Exactly one of [ssn, passportNumber] must be present`

**Parameters:**

- properties: List of properties of which exactly one must be present.

**Applicable To:** object

**Status Codes:** 422

**Declaration**

```yaml
x-validations:
  - function: exactlyOneOf
    parameters:
      properties: [ssn, passportNumber]
```
---