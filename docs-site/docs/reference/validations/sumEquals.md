# sumEquals

Ensures numeric values in a collection sum to an exact value.

**Error Message:**

`Values must sum to 100`

**Parameters:**

- property: Item property containing the numeric value to include in the sum.
- equals: Exact total the summed values must equal.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
allocations:
  x-validations:
    - function: sumEquals
      parameters:
        property: percent
        equals: 100
```
---