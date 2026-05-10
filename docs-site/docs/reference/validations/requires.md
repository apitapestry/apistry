# requires

Requires another property when this property is present.

**Error Message:**

`startDate is required when endDate is present`

**Parameters:**

- property: The property that must also be present.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
endDate:
  x-validations:
    - function: requires
      parameters:
        property: startDate
```
---