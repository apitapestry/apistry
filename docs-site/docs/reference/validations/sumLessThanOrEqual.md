# sumLessThanOrEqual

Ensures numeric values in a collection do not exceed a maximum.

**Error Message:**

`Sum exceeds maximum allowed value`

**Parameters:**

- property: Item property containing the numeric value to include in the sum.
- max: Maximum allowed total for the summed values.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
discounts:
  x-validations:
    - function: sumLessThanOrEqual
      parameters:
        property: amount
        max: 100
```
---