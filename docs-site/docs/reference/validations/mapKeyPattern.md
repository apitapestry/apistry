# mapKeyPattern



**Error Message:**

`Object contains a key that does not match the required pattern`

**Parameters:**

- pattern: Regular expression pattern that every key in the object must match.

**Applicable To:** property

**Status Codes:** 422, 500

**Declaration**

```yaml
metadata:
  type: object
  additionalProperties:
    type: string
  x-validations:
    - function: mapKeyPattern
      parameters:
        pattern: "^[a-zA-Z0-9_]+$"
```
---