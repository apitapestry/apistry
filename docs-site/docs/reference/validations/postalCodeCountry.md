# postalCodeCountry

Validates postal code format for a given country.

**Error Message:**

`Postal code is invalid for the specified country`

**Parameters:**

- country: ISO-3166 alpha-2 country code.
- countryProperty: Property containing the country code, if dynamic.

**Applicable To:** property

**Status Codes:** 422

**Declaration**

```yaml
postalCode:
  x-validations:
    - function: postalCodeCountry
      parameters:
        country: US
```
---