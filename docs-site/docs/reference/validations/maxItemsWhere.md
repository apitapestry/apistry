# maxItemsWhere

Limits the number of array items matching a condition.

**Error Message:**

`Too many matching items`

**Parameters:**

- property: Item property to evaluate when deciding whether an item matches the condition.
- equals: Value the item property must equal for the item to be counted as a match.
- max: Maximum number of matching items permitted in the array.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
contacts:
  x-validations:
    - function: maxItemsWhere
      parameters:
        property: type
        equals: PRIMARY
        max: 1
```
---