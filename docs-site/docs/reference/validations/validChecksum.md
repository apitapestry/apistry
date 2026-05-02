# validChecksum

Validates values using checksum algorithms such as Luhn.

**Error Message:**

`Value has an invalid checksum`

**Parameters:**

- algorithm: Checksum algorithm to apply (e.g., luhn).

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
creditCardNumber:
  x-validations:
    - function: validChecksum
      parameters:
        algorithm: luhn
```
---