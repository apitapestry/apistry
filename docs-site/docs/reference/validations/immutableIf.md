# immutableIf

Prevents modification of a property or object when a condition is met.

**Error Message:**

`Value cannot be modified when status is APPROVED or ARCHIVED`

**Parameters:**

- property: The controlling property whose value determines immutability.
- in: List of values that cause the property or object to become immutable.

**Applicable To:** property, object

**Status Codes:** 422, 500

**Declaration**

```yaml
x-validations:
  - function: immutableIf
    parameters:
      property: status
      in: [APPROVED, ARCHIVED]
```
---