# statePostalCode

Validates that a US ZIP code is plausible for a given state.

**Error Message:**

`ZIP code is not valid for the specified state`

**Parameters:**

- stateProperty: Property containing the US state code.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
zip:
  x-validations:
    - function: statePostalCode
      parameters:
        stateProperty: state
```
---