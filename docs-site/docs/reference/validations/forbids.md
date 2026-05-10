# forbids

Forbids another property when this property is present.

**Error Message:**

`workEmail must not be present when personalEmail is present`

**Parameters:**

- property: The property that must not be present.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
personalEmail:
  x-validations:
    - function: forbids
      parameters:
        property: workEmail
```
---