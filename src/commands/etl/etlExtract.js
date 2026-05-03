import fs from 'fs/promises';
import path from 'path';
import { ConfigurationError } from '../../utils/errors.js';

export default async function extractStage(config, dryRun = false, log, fetchImpl) {
    if (!config) {
        throw new ConfigurationError(
            {},
            { message: 'Extract configuration is missing in ETL config file' }
        );
    }

    if (!config['output-path']) {
        throw new ConfigurationError(
            {},
            { message: 'Extract configuration missing required "output-path" field' }
        );
    }
    if (!config['naming-strategy']) {
        throw new ConfigurationError(
            {},
            { message: 'Extract configuration missing required "naming-strategy" field' }
        );
    }

    // pagination-strategy is optional; default is "none" (single request, no paging)
    const outputPath = config['output-path'];
    const namingStrategy = config['naming-strategy'];
    const paginationStrategy = config['pagination-strategy'] || 'none';
    const unwrapProperty = config['unwrap-property'];
    const actions = config.actions || [];

    if (!dryRun) {
        await fs.mkdir(outputPath, { recursive: true });
    }

    for (const action of actions) {
        const resource = action.resource;
        const url = action.url;

        if (!resource || !url) {
            throw new ConfigurationError(
                { action },
                { message: 'Extract action must include both "resource" and "url" fields' }
            );
        }

        const records = await fetchAllPages(url, paginationStrategy, unwrapProperty, fetchImpl);
        const filename = namingStrategy.replace('{resource}', resource);
        const outFile = path.join(outputPath, filename);

        if (dryRun) {
            log.info(
                {
                    event: 'extract_dryrun',
                    params: { resource, outFile, recordCount: records.length }
                },
                'extract_dryrun'
            );
            continue;
        }

        await fs.writeFile(outFile, JSON.stringify(records, null, 2), 'utf8');
        log.info(
            {
                event: 'extract_completed',
                params: { resource, outFile, recordCount: records.length }
            },
            'extract_completed'
        );
    }
}

async function fetchAllPages(baseUrl, strategy, unwrapProperty, fetchImpl) {
    const fetchFn = fetchImpl || globalThis.fetch;
    if (!fetchFn) {
        throw new ConfigurationError(
            {},
            { message: 'Fetch API is unavailable in this Node.js runtime' }
        );
    }
    const strategies = {
        'none': (url, unwrap) => fetchNoneStrategy(url, unwrap, fetchFn),
        'swapi': (url, unwrap) => fetchSwapiStrategy(url, unwrap, fetchFn),
        'harry-potter': (url) => fetchHarryPotterStrategy(url, fetchFn)
    };
    if (!strategies[strategy]) {
        throw new ConfigurationError('unsupported_pagination_strategy', { strategy, supported: Object.keys(strategies) });
    }
    return strategies[strategy](baseUrl, unwrapProperty);
}

async function fetchNoneStrategy(baseUrl, unwrapProperty, fetchFn) {
    const res = await fetchFn(baseUrl);
    if (!res.ok) {
        throw new ConfigurationError(
            { url: baseUrl, status: res.status, statusText: res.statusText },
            { message: `Failed to fetch data from ${baseUrl}: ${res.status} ${res.statusText}` }
        );
    }
    const json = await res.json();
    const pageItems = unwrapProperty ? json?.[unwrapProperty] : json;
    if (!Array.isArray(pageItems)) {
        const location = unwrapProperty ? `property '${unwrapProperty}'` : 'root';
        throw new ConfigurationError(
            { unwrapProperty: unwrapProperty || null, url: baseUrl },
            { message: `Expected array payload from API at ${location}, but received ${pageItems === null ? 'null' : typeof pageItems}` }
        );
    }
    return pageItems;
}

async function fetchSwapiStrategy(baseUrl, unwrapProperty, fetchFn) {
    let url = baseUrl;
    const results = [];
    while (url) {
        const res = await fetchFn(url);
        if (!res.ok) {
            throw new ConfigurationError(
                { url, status: res.status, statusText: res.statusText },
                { message: `Failed to fetch data from ${url}: ${res.status} ${res.statusText}` }
            );
        }
        const json = await res.json();
        const pageItems = unwrapProperty ? json?.[unwrapProperty] : json;
        if (!Array.isArray(pageItems)) {
            const location = unwrapProperty ? `property '${unwrapProperty}'` : 'root';
            throw new ConfigurationError(
                { unwrapProperty: unwrapProperty || null, url },
                { message: `Expected array payload from API at ${location}, but received ${pageItems === null ? 'null' : typeof pageItems}` }
            );
        }
        results.push(...pageItems);
        url = json.next;
    }
    return results;
}

async function fetchHarryPotterStrategy(baseUrl, fetchFn) {
    let url = new URL(baseUrl);
    let pageNumber = 1;
    const pageSize = 100; // Use max page size for efficiency
    const results = [];
    while (url) {
        url.searchParams.set('page[number]', pageNumber);
        url.searchParams.set('page[size]', pageSize);
        const res = await fetchFn(url.toString());
        if (!res.ok) {
            throw new ConfigurationError(
                { url: url.toString(), status: res.status, statusText: res.statusText },
                { message: `Failed to fetch data from ${url}: ${res.status} ${res.statusText}` }
            );
        }
        const json = await res.json();
        const pageItems = json?.data;
        if (!Array.isArray(pageItems)) {
            throw new ConfigurationError(
                { url: url.toString() },
                { message: `Expected array payload from API at property 'data', but received ${pageItems === null ? 'null' : typeof pageItems}` }
            );
        }
        results.push(...pageItems);
        // Check for next page
        const nextUrl = json?.links?.next;
        if (nextUrl) {
            url = new URL(nextUrl, url.origin);
            pageNumber++;
        } else {
            url = null;
        }
    }
    return results;
}
