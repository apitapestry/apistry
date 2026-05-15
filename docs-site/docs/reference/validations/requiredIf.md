# requiredIf

Requires one or more properties when another property has a specific value.

**Error Message:**

`Required properties are missing for the current condition`

**Parameters:**

- property: The controlling property whose value triggers the requirement.
- in: List of values that activate the requirement.
- required: List of properties that must be present when the condition is met.

**Applicable To:** property, object

**Status Codes:** 422

**Declaration**

```yaml
x-validations:
  - function: requiredIf
    parameters:
      property: status
      in: [CANCELLED]
      required: [cancelReason]
```
---