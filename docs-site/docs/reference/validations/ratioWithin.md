# ratioWithin

Ensures the ratio between two numeric properties falls within bounds.

**Error Message:**

`Ratio is outside the allowed range`

**Parameters:**

- numerator: Property name to use as the numerator in the ratio.
- denominator: Property name to use as the denominator in the ratio.
- min: Minimum allowed ratio (inclusive).
- max: Maximum allowed ratio (inclusive).

**Applicable To:** object

**Status Codes:** 422

**Declaration**

```yaml
x-validations:
  - function: ratioWithin
    parameters:
      numerator: downPayment
      denominator: price
      min: 0.05
      max: 0.3
```
---