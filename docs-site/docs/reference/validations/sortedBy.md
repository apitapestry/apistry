# sortedBy

Ensures an array is sorted by a property.

**Error Message:**

`Array must be sorted by dueDate (asc)`

**Parameters:**

- property: Property used to determine sort order.
- order: Sort direction: asc or desc.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
milestones:
  x-validations:
    - function: sortedBy
      parameters:
        property: dueDate
        order: asc
```
---