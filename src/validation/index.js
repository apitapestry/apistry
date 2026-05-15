// NOTE: registry only imports validators that exist in src/validation/validations
import { allOrNone } from './validations/allOrNone.js';
import { atLeastOneOf } from './validations/atLeastOneOf.js';
import { base64 } from './validations/base64.js';
import { compare } from './validations/compare.js';
import { countryCode } from './validations/countryCode.js';
import { currencyCode } from './validations/currencyCode.js';
import { exactlyOneOf } from './validations/exactlyOneOf.js';
import { forbids } from './validations/forbids.js';
import { httpCheck } from './validations/httpCheck.js';
import { immutableIf } from './validations/immutableIf.js';
import { mapKeyPattern } from './validations/mapKeyPattern.js';
import { maxItemsWhere } from './validations/maxItemsWhere.js';
import { noSqlInjectionMongo } from './validations/noSqlInjectionMongo.js';
import { postalCodeCountry } from './validations/postalCodeCountry.js';
import { profanity } from './validations/profanity.js';
import { ratioWithin } from './validations/ratioWithin.js';
import { regionCode } from './validations/regionCode.js';
import { requiredIf } from './validations/requiredIf.js';
import { requires } from './validations/requires.js';
import { sortedBy } from './validations/sortedBy.js';
import { statePostalCode } from './validations/statePostalCode.js';
import { sumEquals } from './validations/sumEquals.js';
import { sumLessThanOrEqual } from './validations/sumLessThanOrEqual.js';
import { timeZone } from './validations/timeZone.js';
import { uniqueBy } from './validations/uniqueBy.js';
import { url } from './validations/url.js';
import { usPhoneNumber } from './validations/usPhoneNumber.js';
import { validChecksum } from './validations/validChecksum.js';
import { whiteSpaceOnly } from './validations/whiteSpaceOnly.js';

export const VALIDATION_FUNCTIONS = {
    allOrNone,
    atLeastOneOf,
    base64,
    compare,
    countryCode,
    currencyCode,
    exactlyOneOf,
    forbids,
    httpCheck,
    immutableIf,
    mapKeyPattern,
    maxItemsWhere,
    noSqlInjectionMongo,
    postalCodeCountry,
    profanity,
    ratioWithin,
    regionCode,
    requiredIf,
    requires,
    sortedBy,
    statePostalCode,
    sumEquals,
    sumLessThanOrEqual,
    timeZone,
    uniqueBy,
    url,
    usPhoneNumber,
    validChecksum,
    whiteSpaceOnly
};
