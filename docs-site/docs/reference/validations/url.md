# url

Validates absolute URLs with optional localhost allowance.

**Error Message:**

`Value must be a valid absolute URL`

**Parameters:**

- allowLocalhost: Whether localhost URLs are allowed.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
callbackUrl:
  x-validations:
    - function: url
      parameters:
        allowLocalhost: false
```
---