# uniqueBy

Ensures array items are unique by a property.

**Error Message:**

`Array items must be unique by code`

**Parameters:**

- property: Property whose value must be unique across array items.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
roles:
  x-validations:
    - function: uniqueBy
      parameters:
        property: code
```
---