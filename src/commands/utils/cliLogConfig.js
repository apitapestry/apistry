/**
 * Print a human-readable startup configuration summary.
 * CLI-only. Not a log. Do not reuse for server output.
 */
export default function cliLogConfig(commandName, config) {
    console.log('');
    console.log('────────────────────────────────────────');
    console.log(`🚀 ${commandName}`);
    console.log('────────────────────────────────────────');
    for (const [key, value] of Object.entries(config)) {
        const label = formatLabel(key);
        const displayValue = formatValue(key, value);

        console.log(`• ${label.padEnd(15)}: ${displayValue}`);
    }
    console.log('────────────────────────────────────────');
    console.log('');
}

function formatLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, c => c.toUpperCase());
}

function formatValue(key, value) {
    if (value === null || value === undefined) {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'enabled' : 'disabled';
    }

    if (typeof value === 'object') {
        return formatObject(value);
    }

    return String(value);
}

function formatObject(obj) {
    const entries = Object.entries(obj);

    if (entries.length === 0) return '{}';

    // single-line for small objects
    if (entries.length <= 3) {
        return `{ ${entries
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join(', ')} }`;
    }

    // multi-line summary for larger objects
    return `${entries.length} properties`;
}
