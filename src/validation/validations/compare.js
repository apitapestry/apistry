/**
 * Apistry compare validator
 *
 * This validator is fully compliant with the centralized error model and operand resolution utilities in _helpers.js.
 * - All errors are constructed using shared utilities (dataError, definitionError).
 * - Operand resolution is performed via resolveOperand.
 * - No HTTP status codes are chosen here; mapping is enforced centrally.
 * - No new error fields or semantics are introduced.
 * - See _helpers.js for internal error model documentation and invariants.
 */

import { dataError, definitionError, present, resolveOperand } from '../_helpers.js';

function isValidOperator(op) {
    return ['<', '>', '<=', '>=', '=', '!=', '<>', 'in', 'between'].includes(op);
}

function isNumericString(v) {
    return typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v));
}

function toNumberStrict(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (isNumericString(v)) return Number(v);
    return null;
}

function parseNowToken(raw) {
    if (typeof raw !== 'string') return null;
    const s = raw.trim();

    // Supported forms:
    // - now
    // - now(day|month|year)
    // - now±<int><unit>           (e.g., now-18y, now+2mo, now-7d)
    // - now(day|month|year)±<int><unit>
    // Units: y (years), mo (months), d (days)

    // now / now(day)
    let m = /^now(?:\((year|month|day)\))?$/i.exec(s);
    if (m) {
        return { type: 'now', truncate: m[1]?.toLowerCase() ?? null, offset: null, label: m[1] ? `now(${m[1].toLowerCase()})` : 'now' };
    }

    // now-18y / now+2mo / now(day)-18y
    m = /^now(?:\((year|month|day)\))?\s*([+-])\s*(\d+)\s*(y|mo|d)$/i.exec(s);
    if (!m) return null;

    const truncate = m[1]?.toLowerCase() ?? null;
    const sign = m[2] === '-' ? -1 : 1;
    const amount = Number(m[3]);
    if (!Number.isFinite(amount) || amount < 0) return null;
    const unit = m[4].toLowerCase();

    const baseLabel = truncate ? `now(${truncate})` : 'now';
    const offsetLabel = `${m[2]}${amount}${unit}`;

    return {
        type: 'now',
        truncate,
        offset: { sign, amount, unit },
        label: `${baseLabel}${offsetLabel}`
    };
}

function applyDateOffset(d, offset) {
    if (!offset) return new Date(d);
    const t = new Date(d);
    const delta = offset.sign * offset.amount;

    if (offset.unit === 'y') {
        t.setFullYear(t.getFullYear() + delta);
        return t;
    }
    if (offset.unit === 'mo') {
        t.setMonth(t.getMonth() + delta);
        return t;
    }
    if (offset.unit === 'd') {
        t.setDate(t.getDate() + delta);
        return t;
    }

    // Should never happen due to parseNowToken unit whitelist.
    return t;
}

function truncateDate(d, truncate) {
    const t = new Date(d);
    if (!truncate) return t;

    if (truncate === 'year') {
        t.setMonth(0, 1);
        t.setHours(0, 0, 0, 0);
        return t;
    }

    if (truncate === 'month') {
        t.setDate(1);
        t.setHours(0, 0, 0, 0);
        return t;
    }

    if (truncate === 'day') {
        t.setHours(0, 0, 0, 0);
        return t;
    }

    return t;
}

function toComparable({ schema, raw, property, side }) {
    // Returns { ok: true, value: <comparable>, label?: string } or { ok: false, failure: [...] }

    if (!present(raw)) {
        // Missing operands are a contract/config issue; validators aren't responsible for requiredness.
        return { ok: false, failure: definitionError(property, `Missing ${side} operand`) };
    }

    // --- Numbers ---
    if (schema?.type === 'number' || schema?.type === 'integer') {
        // Support now(year) tokens for numeric comparisons (e.g., modelYear <= now(year)+1y)
        const nowToken = parseNowToken(raw);
        if (nowToken) {
            if (nowToken.truncate !== 'year') {
                return {
                    ok: false,
                    failure: definitionError(property, `now(${nowToken.truncate ?? '...'}) is not supported for numeric compare; use now(year)`)
                };
            }
            // Only year offsets make sense for integer years.
            if (nowToken.offset && nowToken.offset.unit !== 'y') {
                return {
                    ok: false,
                    failure: definitionError(property, `Offset unit '${nowToken.offset.unit}' is not supported for numeric compare; use 'y' with now(year)`)
                };
            }

            const baseYear = new Date().getFullYear();
            const year = nowToken.offset
                ? baseYear + (nowToken.offset.sign * nowToken.offset.amount)
                : baseYear;

            return { ok: true, value: year, label: nowToken.label ?? 'now(year)' };
        }

        const n = toNumberStrict(raw);
        if (n === null) {
            // If RHS is not numeric, this is a definition/config issue; if LHS fails, it's data.
            const err = (side === 'right')
                ? definitionError(property, 'Invalid number operand in compare definition', raw)
                : dataError(property, 'Invalid number value', raw);
            return { ok: false, failure: err };
        }
        return { ok: true, value: n };
    }

    // --- Strings (format-driven) ---
    if (schema?.type === 'string') {
        const fmt = schema?.format;

        if (fmt === 'date-time' || fmt === 'date') {
            const nowToken = parseNowToken(raw);
            if (nowToken) {
                const base = truncateDate(new Date(), nowToken.truncate);
                const d = applyDateOffset(base, nowToken.offset);
                return { ok: true, value: d.getTime(), label: nowToken.label ?? (nowToken.truncate ? `now(${nowToken.truncate})` : 'now') };
            }

            if (typeof raw !== 'string') {
                return { ok: false, failure: dataError(property, 'Invalid date value', raw) };
            }

            // RFC3339 / ISO-8601 parsing enforced by requiring a valid Date.
            const d = new Date(raw);
            if (Number.isNaN(d.getTime())) {
                return { ok: false, failure: dataError(property, 'Invalid date value', raw) };
            }
            return { ok: true, value: d.getTime() };
        }

        if (fmt === 'time') {
            // RFC3339 partial-time: HH:MM:SS[.frac]
            if (typeof raw !== 'string') {
                return { ok: false, failure: dataError(property, 'Invalid time value', raw) };
            }

            const m = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(raw);
            if (!m) {
                return { ok: false, failure: dataError(property, 'Invalid time value', raw) };
            }
            const hh = Number(m[1]);
            const mm = Number(m[2]);
            const ss = Number(m[3]);
            if (hh > 23 || mm > 59 || ss > 59) {
                return { ok: false, failure: dataError(property, 'Invalid time value', raw) };
            }
            // Comparable number of ms since start of day.
            const msFrac = m[4] ? Number(`0.${m[4]}`) * 1000 : 0;
            const ms = ((hh * 60 + mm) * 60 + ss) * 1000 + Math.round(msFrac);
            return { ok: true, value: ms };
        }

        // No lexicographic comparisons unless explicitly supported by schema format.
        return {
            ok: false,
            failure: definitionError(property, `compare validation not supported for string format '${fmt ?? 'none'}'`)
        };
    }

    return {
        ok: false,
        failure: definitionError(property, `compare validation not supported for schema type '${schema?.type ?? 'unknown'}'`)
    };
}

function opMessage(op) {
    if (op === '<') return 'be less than';
    if (op === '<=') return 'be less than or equal to';
    if (op === '>') return 'be greater than';
    if (op === '>=') return 'be greater than or equal to';
    if (op === '=') return 'equal';
    if (op === '!=' || op === '<>') return 'not equal';
    if (op === 'in') return 'be one of';
    if (op === 'between') return 'be between';
    return 'satisfy constraint';
}

function resolveRhs({ params, body }) {
    return resolveOperand({ params, body });
}

function isComparableOp(op) {
    return ['<', '>', '<=', '>=', '=', '!=', '<>'].includes(op);
}

function normalizeString(v) {
    return String(v).trim().toLowerCase();
}

/**
 * compare validation
 *
 * Generic schema-driven comparison validator.
 *
 * Status mapping note:
 * - This validator returns canonical Apistry validation errors with `type: 'data' | 'definition'`.
 * - HTTP status codes are applied centrally by `runValidationRule()`.
 * - All non-external failures (including definition/contract issues) map to HTTP 422.
 *
 * Parameters:
 * - operator: <, >, <=, >=, =, !=, <>, in, between
 * - value: literal right-hand operand (or special datetime token like now/now(day))
 * - field: path to another field in the same object (currently top-level property name)
 */

export function compare({ value, property, params = {}, body = {}, schema }) {
    // Not responsible for requiredness.
    if (!present(value)) return [];

    const op = params.operator;
    if (!isValidOperator(op)) {
        return definitionError(property, `Invalid compare operator '${op}'`);
    }

    const rhs = resolveRhs({ params, body });
    if (rhs.source === 'none') {
        return definitionError(property, "compare requires either 'value' or 'field'");
    }
    if (rhs.source === 'field' && !rhs.present) {
        return definitionError(property, `Field '${rhs.path}' not found for comparison`);
    }

    const left = toComparable({ schema, raw: value, property, side: 'left' });
    if (!left.ok) return left.failure;

    // Normalized/case-insensitive string comparison
    const normalize = params.normalize === true || params.caseInsensitive === true;
    if ((op === '=' || op === '!=' || op === '<>') && normalize && typeof value === 'string' && typeof rhs.value === 'string') {
        const leftNorm = normalizeString(value);
        const rightNorm = normalizeString(rhs.value);
        const isEqual = leftNorm === rightNorm;
        if ((op === '=' && isEqual) || ((op === '!=' || op === '<>') && !isEqual)) {
            return [];
        }
        const targetLabel = rhs.source === 'field' ? `'${rhs.path}'` : (rhs.value ?? '');
        return dataError(property, `Must ${opMessage(op)} ${targetLabel} (normalized)`, value);
    }

    if (op === 'in') {
        if (!Array.isArray(rhs.value)) {
            return definitionError(property, "'in' operator requires the right-hand operand to be an array");
        }

        // Coerce each element using schema.
        const coerced = [];
        for (const el of rhs.value) {
            const r = toComparable({ schema, raw: el, property, side: 'right' });
            if (!r.ok) return r.failure;
            coerced.push(r.value);
        }

        if (!coerced.includes(left.value)) {
            return dataError(property, `Must ${opMessage(op)} the allowed set`, value);
        }
        return [];
    }

    if (op === 'between') {
        const rhsValue = rhs.value;
        let lowerRaw;
        let upperRaw;

        if (Array.isArray(rhsValue) && rhsValue.length === 2) {
            [lowerRaw, upperRaw] = rhsValue;
        } else if (rhsValue && typeof rhsValue === 'object' && present(rhsValue.min) && present(rhsValue.max)) {
            lowerRaw = rhsValue.min;
            upperRaw = rhsValue.max;
        } else {
            return definitionError(property, "'between' operator requires [min,max] or {min,max} on the right-hand operand");
        }

        const lower = toComparable({ schema, raw: lowerRaw, property, side: 'right' });
        if (!lower.ok) return lower.failure;

        const upper = toComparable({ schema, raw: upperRaw, property, side: 'right' });
        if (!upper.ok) return upper.failure;

        if (left.value < lower.value || left.value > upper.value) {
            return dataError(property, `Must ${opMessage(op)} the allowed range`, value);
        }
        return [];
    }

    if (isComparableOp(op)) {
        const right = toComparable({ schema, raw: rhs.value, property, side: 'right' });
        if (!right.ok) {
            return right.failure;
        }

        const ok = (() => {
            switch (op) {
                case '<':
                    return left.value < right.value;
                case '<=':
                    return left.value <= right.value;
                case '>':
                    return left.value > right.value;
                case '>=':
                    return left.value >= right.value;
                case '=':
                    return left.value === right.value;
                case '!=':
                case '<>':
                    return left.value !== right.value;
                default:
                    return true;
            }
        })();

        if (ok) return [];

        // Mention field name when used.
        const targetLabel = rhs.source === 'field'
            ? `'${rhs.path}'`
            : (right.label ?? String(rhs.value));

        return dataError(property, `Must ${opMessage(op)} ${targetLabel}`, value);
    }

    // Should never hit.
    return definitionError(property, `Unhandled compare operator '${op}'`);
}
