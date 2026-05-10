/**
 * Pure, schema-driven normalization engine.
 *
 * - Applies x-transforms declared on schema properties
 * - Coerces output values based on OpenAPI schema types
 * - Supports normalizing objects, arrays, and wrapped collections
 *
 * No I/O, no logging, no orchestration context.
 */

import { randomUUID } from 'crypto';

const DEFAULT_CONVERTERS = {
    'cm-to-inches': value => {
        const n = Number(value);
        return Number.isNaN(n) ? undefined : n / 2.54;
    },

    'kg-to-pounds': value => {
        const n = Number(value);
        return Number.isNaN(n) ? undefined : n * 2.2046226218;
    },

    'to-lower-case': value => {
        if (value === undefined || value === null) return value;
        return String(value).toLowerCase();
    },

    'to-upper-case': value => {
        if (value === undefined || value === null) return value;
        return String(value).toUpperCase();
    },

    'to-camel-case': value => {
        if (value === undefined || value === null) return value;

        return String(value)
            .replace(/[_\-\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
            .replace(/^(.)/, m => m.toUpperCase());
    }
};

/**
 * Normalize input payload according to a resolved OpenAPI schema.
 *
 * @param {object|array} input
 * @param {object} schema
 * @param {boolean} [isEtl=false] Optional. If true, indicates this is called from the ETL process.
 */
export function normalize(input, schema, isEtl = false) {
    const useResults = schema?.type === 'object' && schema?.properties?.results;
    if (useResults) {
        schema = schema.properties.results;
    }

    if (Array.isArray(input)) {
        const itemSchema = schema?.items ?? schema;
        return input.map(item => normalizeObject(item, itemSchema, isEtl));
    }

    if (input && typeof input === 'object') {
        return normalizeObject(input, schema, isEtl);
    }

    return input;
}

function normalizeObject(jsonItem, schema, isEtl = false) {
    if (!schema || schema.type !== 'object') return jsonItem;

    const result = {};

    for (const [propName, propSchema] of Object.entries(schema.properties || {})) {
        let transforms = propSchema['x-transforms'];
        if (isEtl) {
            transforms = propSchema['x-etl-transforms'];
        }

        let value;

        if (Array.isArray(transforms)) {
            // Always use 'property' as the defaultTransformSource
            const initialValue = jsonItem?.[propName];
            value = applyTransforms(jsonItem, result, transforms, initialValue);
        } else if (jsonItem?.[propName] !== undefined) {
            value = jsonItem[propName];
        } else {
            // Schema-driven inserts (ETL-friendly): allow the contract to declare
            // server insert behavior and let normalization materialize values.
            // Only acts when the property is missing/undefined.
            const insertDirective = propSchema?.['x-insert'];
            if (insertDirective === 'uuid' && propSchema?.format === 'uuid') {
                value = randomUUID();
            }
        }

        if (value !== undefined) {
            let finalValue = normalize(value, propSchema, isEtl);
            if (typeof finalValue !== 'object' || finalValue === null) {
                finalValue = coerceValue(finalValue, propSchema);
            }
            result[propName] = finalValue;
        }
    }

    return result;
}

function applyTransforms(item, output, transforms, initialValue) {
    let value = initialValue;
    const converters = DEFAULT_CONVERTERS;

    for (const step of transforms) {
        const [op, arg] = Object.entries(step)[0];

        switch (op) {
            case 'source': {
                // Support both direct keys and dot-paths (e.g., "wand.wood").
                // Prefer item first, then already-built output.
                const fromItem = getByPath(item, arg);
                value = fromItem !== undefined ? fromItem : getByPath(output, arg);
                break;
            }

            case 'pick': {
                if (!Array.isArray(value)) {
                    // ETL explicitly clears non-array values
                    value = undefined;
                    break;
                }
                if (arg === 'first') value = value[0];
                break;
            }

            case 'apply-pattern': {
                if (typeof value !== 'string') {
                    value = undefined;
                    break;
                }
                const match = value.match(new RegExp(normalizeRegex(arg)));
                value = match ? match[1] : undefined;
                break;
            }

            case 'map-pattern': {
                if (!Array.isArray(value)) {
                    value = [];
                    break;
                }
                const regex = new RegExp(normalizeRegex(arg));
                value = value
                    .map(v => {
                        if (typeof v !== 'string') return undefined;
                        const match = v.match(regex);
                        return match ? match[1] : undefined;
                    })
                    .filter(v => v !== undefined);
                break;
            }

            case 'apply-template': {
                const template = String(arg);
                const applyOne = v => {
                    if (v === undefined || v === null) return undefined;
                    // Replace all occurrences of {} with string value
                    return template.replace(/\{\}/g, String(v));
                };

                if (Array.isArray(value)) {
                    value = value
                        .map(applyOne)
                        .filter(v => v !== undefined);
                    break;
                }

                value = applyOne(value);
                break;
            }

            case 'convert': {
                const fn = converters[arg];
                if (!fn) {
                    // Pure module throws; caller decides how to interpret.
                    throw new Error(
                        `Unknown converter '${arg}'. Available converters: ${Object.keys(converters).join(', ')}`
                    );
                }
                value = fn(value);
                break;
            }

            case 'reformat-date': {
                value = reformatDate(value, arg);
                break;
            }

            default:
                throw new Error(
                    `Unknown transform operator '${op}'. Valid operators: source, pick, apply-pattern, map-pattern, apply-template, convert, reformat-date`
                );
        }
    }

    return value;
}

function getByPath(obj, path) {
    if (obj === undefined || obj === null) return undefined;
    if (typeof path !== 'string' || path.length === 0) return undefined;

    // Fast path: direct key exists (including keys containing dots)
    if (typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, path)) {
        return obj[path];
    }

    // Dot-notation traversal: a.b.c
    if (!path.includes('.')) {
        return obj?.[path];
    }

    const parts = path.split('.').filter(Boolean);
    let cur = obj;

    for (const key of parts) {
        if (cur === undefined || cur === null) return undefined;
        cur = cur[key];
    }

    return cur;
}

// Best-effort date parser/formatter for normalization.
//
// Supported inputs include:
// - ISO-ish: 1980-07-31, 1980-07-31T10:20:30Z, 1980-07-31 10:20:30
// - DMY/MDY: 31-07-1980, 31/07/1980, 07/31/1980
// - YMD with slashes: 1980/07/31
// - With time: 31-07-1980 10:20:30, 31-07-1980T10:20:30
//
// Output:
// - If a time component is present (or mode === 'date-time'): ISO date-time in UTC (Z)
// - Otherwise (or mode === 'date'): ISO date (YYYY-MM-DD)
function reformatDate(input, options) {
    if (input === undefined || input === null) return input;

    // Map over arrays for convenience
    if (Array.isArray(input)) {
        return input
            .map(v => reformatDate(v, options))
            .filter(v => v !== undefined);
    }

    if (typeof input !== 'string' && typeof input !== 'number' && !(input instanceof Date)) {
        return input;
    }

    const rawOptions = options;

    // Backward compatible options:
    // - 'date' | 'date-time'
    // - { mode: 'date'|'date-time', prefer?: 'dmy'|'mdy' }
    // New:
    // - input format string like 'dd-mm-yyyy' or 'yyyy/mm/dd'
    const inputFormat =
        typeof rawOptions === 'string' &&
        rawOptions !== 'date' &&
        rawOptions !== 'date-time'
            ? rawOptions
            : typeof rawOptions?.input === 'string'
              ? rawOptions.input
              : undefined;

    const mode =
        typeof rawOptions === 'string'
            ? rawOptions === 'date' || rawOptions === 'date-time'
                ? rawOptions
                : undefined
            : typeof rawOptions?.mode === 'string'
              ? rawOptions.mode
              : undefined; // 'date' | 'date-time'

    const prefer =
        typeof rawOptions?.prefer === 'string'
            ? rawOptions.prefer
            : 'dmy'; // 'dmy' | 'mdy'

    const raw = input instanceof Date ? input.toISOString() : String(input).trim();
    if (!raw) return undefined;

    // If value is already ISO date or ISO date-time, keep/normalize it.
    // YYYY-MM-DD
    const isoDateMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoDateMatch) return raw;

    const looksLikeDateTime = /[T\s]\d{2}:\d{2}/.test(raw) || /Z$|[+-]\d{2}:?\d{2}$/.test(raw);

    // Explicit input format parsing (deterministic)
    if (inputFormat) {
        const parts = parseWithExplicitFormat(raw, inputFormat);
        if (parts) {
            const { year, month, day, hour, minute, second, millisecond, hasTime } = parts;
            if (!isValidYmd(year, month, day)) return input;

            const outMode = mode ?? (hasTime ? 'date-time' : 'date');
            if (outMode === 'date') {
                return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
            }

            const ms = Date.UTC(
                year,
                month - 1,
                day,
                hour ?? 0,
                minute ?? 0,
                second ?? 0,
                millisecond ?? 0
            );
            return new Date(ms).toISOString();
        }

        // If user provided an input format but it doesn't match, don't guess.
        return input;
    }

    // Best-effort parsing for numeric dates.
    const parts = parseNumericDateLike(raw, { prefer });
    if (parts) {
        const { year, month, day, hour, minute, second, millisecond, hasTime } = parts;

        if (!isValidYmd(year, month, day)) return input;

        if (mode === 'date' || (!hasTime && mode !== 'date-time')) {
            return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
        }

        const ms = Date.UTC(
            year,
            month - 1,
            day,
            hour ?? 0,
            minute ?? 0,
            second ?? 0,
            millisecond ?? 0
        );
        const d = new Date(ms);
        return d.toISOString();
    }

    // Fallback: if Date can parse it, use that.
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
        if (mode === 'date' || (!looksLikeDateTime && mode !== 'date-time')) {
            return d.toISOString().slice(0, 10);
        }
        return d.toISOString();
    }

    return input;
}

function parseWithExplicitFormat(raw, format) {
    if (typeof raw !== 'string' || typeof format !== 'string') return undefined;

    const fmt = format.trim().toLowerCase();

    // Allow a couple aliases
    if (fmt === 'iso' || fmt === 'yyyy-mm-dd') {
        const m = raw.match(/^\s*(\d{4})-(\d{2})-(\d{2})\s*$/);
        if (!m) return undefined;
        return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hasTime: false };
    }

    // Determine separator from format (supports '-', '/', '.')
    const sepMatch = fmt.match(/[^a-z]/);
    const sep = sepMatch ? sepMatch[0] : undefined;
    if (!sep) return undefined;

    const fmtParts = fmt.split(sep).filter(Boolean);
    const rawParts = raw.trim().split(sep).filter(Boolean);
    if (fmtParts.length !== 3 || rawParts.length !== 3) return undefined;

    const map = {};
    for (let i = 0; i < 3; i++) {
        map[fmtParts[i]] = rawParts[i];
    }

    const y = map['yyyy'];
    const m = map['mm'];
    const d = map['dd'];
    if (!y || !m || !d) return undefined;

    if (!/^\d{4}$/.test(y)) return undefined;
    if (!/^\d{1,2}$/.test(m)) return undefined;
    if (!/^\d{1,2}$/.test(d)) return undefined;

    return {
        year: Number(y),
        month: Number(m),
        day: Number(d),
        hasTime: false
    };
}

function parseNumericDateLike(raw, { prefer = 'dmy' } = {}) {
    // Capture: date separators + optional time
    // Examples:
    // 31-07-1980
    // 31/07/1980 10:20
    // 31-07-1980T10:20:30.123
    const m = raw.match(
        /^\s*(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?(?:\s*(Z|[+-]\d{2}:?\d{2})\s*)?$/
    );
    if (!m) return undefined;

    let a = Number(m[1]);
    let b = Number(m[2]);
    let c = Number(m[3]);

    const hour = m[4] !== undefined ? Number(m[4]) : undefined;
    const minute = m[5] !== undefined ? Number(m[5]) : undefined;
    const second = m[6] !== undefined ? Number(m[6]) : undefined;
    const frac = m[7];
    const tz = m[8];

    const hasTime = hour !== undefined;

    // Decide which token is year
    let year;
    let month;
    let day;

    // If first token is 4-digit year => YMD
    if (m[1].length === 4) {
        year = a;
        month = b;
        day = c;
    } else if (m[3].length === 4) {
        year = c;

        // Disambiguate between DMY and MDY for a-b-year
        // If one component > 12, it must be day.
        if (a > 12 && b <= 12) {
            day = a;
            month = b;
        } else if (b > 12 && a <= 12) {
            month = a;
            day = b;
        } else {
            // ambiguous (both <=12) => prefer option
            if (prefer === 'mdy') {
                month = a;
                day = b;
            } else {
                day = a;
                month = b;
            }
        }
    } else {
        // No clear year token (e.g., 1-2-03). Not safe to guess.
        return undefined;
    }

    // If there's an explicit timezone offset, JS Date parsing could handle it,
    // but our numeric parser currently treats times as UTC without offsets.
    // For now, bail out to the Date(raw) fallback in that case.
    if (tz && tz !== 'Z') return undefined;

    let millisecond;
    if (frac !== undefined) {
        // Normalize to milliseconds (3 digits) by trimming/padding
        const msStr = frac.length >= 3 ? frac.slice(0, 3) : frac.padEnd(3, '0');
        millisecond = Number(msStr);
    }

    // Validate time ranges if present
    if (hasTime) {
        if (hour < 0 || hour > 23) return undefined;
        if (minute < 0 || minute > 59) return undefined;
        if (second !== undefined && (second < 0 || second > 59)) return undefined;
        if (millisecond !== undefined && (millisecond < 0 || millisecond > 999)) return undefined;
    }

    return { year, month, day, hour, minute, second, millisecond, hasTime };
}

function isValidYmd(year, month, day) {
    if (!Number.isInteger(year) || year < 0 || year > 9999) return false;
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    if (!Number.isInteger(day) || day < 1 || day > 31) return false;

    // Validate day-of-month by constructing a UTC date
    const d = new Date(Date.UTC(year, month - 1, day));
    return (
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === month - 1 &&
        d.getUTCDate() === day
    );
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function pad4(n) {
    return String(n).padStart(4, '0');
}

// Ensure regex args are treated consistently whether passed as strings or /regex/.
function normalizeRegex(pattern) {
    if (pattern instanceof RegExp) return pattern.source;
    return String(pattern);
}

// Coerce scalar values into the schema's declared type/format.
// Only called for non-object outputs.
function coerceValue(value, schema) {
    if (value === undefined || value === null) return value;

    const type = schema?.type;

    if (type === 'number' || type === 'integer') {
        const n = Number(value);
        if (Number.isNaN(n)) return undefined;
        return type === 'integer' ? Math.trunc(n) : n;
    }

    if (type === 'boolean') {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const v = value.trim().toLowerCase();
            if (v === 'true' || v === '1' || v === 'yes' || v === 'y') return true;
            if (v === 'false' || v === '0' || v === 'no' || v === 'n') return false;
        }
        return undefined;
    }

    if (type === 'string') {
        // Keep strings as-is; normalization/transforms handle formats.
        return String(value);
    }

    return value;
}

