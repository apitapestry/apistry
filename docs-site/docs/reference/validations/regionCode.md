# regionCode

Validates a region (state or province) code for a given country.

**Error Message:**

`Value must be a valid region code for the specified country`

**Parameters:**

- country: ISO-3166 alpha-2 country code.
- countryProperty: Property containing the country code, if dynamic.

**Applicable To:** property

**Status Codes:** 422, 500

**Declaration**

```yaml
state:
  x-validations:
    - function: regionCode
      parameters:
        country: US
```
---