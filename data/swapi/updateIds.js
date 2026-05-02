import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_BASE = 'http://localhost:3000/v1';
const TARGETS = [
  {
    keys: ['speciesIds', 'characterSpeciesId'],
    endpoint: '/species',
    resultIdField: 'speciesId',
    targetKey: (key) => key,
  },
  {
    keys: ['starshipIds'],
    endpoint: '/starships',
    resultIdField: 'starshipId',
    targetKey: (key) => key,
  },
  {
    keys: ['vehicleIds'],
    endpoint: '/vehicles',
    resultIdField: 'vehicleId',
    targetKey: (key) => key,
  },
  {
    keys: ['characterIds'],
    endpoint: '/people',
    resultIdField: 'personId',
      targetKey: (key) => key,
  },
  {
    keys: ['planetIds', 'homeworldPlanetId'],
    endpoint: '/planets',
    resultIdField: 'planetId',
    targetKey: (key) => key,
  },
  {
    keys: ['filmIds'],
    endpoint: '/films',
    resultIdField: 'filmId',
    targetKey: (key) => key,
  },
];

const KEY_RULES = new Map();
for (const rule of TARGETS) {
  for (const key of rule.keys) {
    KEY_RULES.set(key, rule);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeIds(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(isNonEmptyString);
  }
  if (typeof value === 'number') return [String(value)];
  if (isNonEmptyString(value)) {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(isNonEmptyString);
  }
  return [];
}

function formatIdsLikeOriginal(originalValue, newIds) {
  // Keep the input type intact:
  // - array -> array
  // - string -> string (first value)
  // - number -> number (first value)
  // - anything else -> array (safe default for list-like fields)
  if (Array.isArray(originalValue)) return newIds;

  const first = newIds.length > 0 ? newIds[0] : null;

  if (typeof originalValue === 'number') {
    const asNum = first == null ? null : Number(first);
    return Number.isFinite(asNum) ? asNum : originalValue;
  }

  if (typeof originalValue === 'string') {
    return first == null ? '' : String(first);
  }

  return newIds;
}

function pickResultId(result, rule) {
  const candidates = [rule.resultIdField, 'personId', 'id'];
  for (const key of candidates) {
    const value = result?.[key];
    if (typeof value === 'number' || isNonEmptyString(value)) return String(value);
  }
  return null;
}

function normalizeApiBase(apiBase) {
  if (!apiBase) return DEFAULT_API_BASE;
  return apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data, dryRun) {
  if (dryRun) return;
  const payload = JSON.stringify(data, null, 2) + '\n';
  await writeFile(filePath, payload, 'utf8');
}

async function walkDir(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('v2.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function fetchMappedIds(ids, rule, ctx) {
  if (ids.length === 0) return [];

  const idsCsv = ids.join(',');
  const cacheKey = `${rule.endpoint}|${idsCsv}`;
  if (ctx.cache.has(cacheKey)) return ctx.cache.get(cacheKey);

  const url = `${ctx.apiBase}${rule.endpoint}?id=in.${idsCsv}`;
  const response = await ctx.fetchImpl(url);
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${url}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const newIds = results
    .map((item) => pickResultId(item, rule))
    .filter(isNonEmptyString);

  ctx.cache.set(cacheKey, newIds);
  return newIds;
}

async function updateObjectIds(value, ctx) {
  if (Array.isArray(value)) {
    let changed = false;
    for (const item of value) {
      if (item && typeof item === 'object') {
        changed = (await updateObjectIds(item, ctx)) || changed;
      }
    }
    return changed;
  }

  if (!value || typeof value !== 'object') return false;

  let changed = false;
  for (const key of Object.keys(value)) {
    const rule = KEY_RULES.get(key);
    if (!rule) {
      const child = value[key];
      if (child && typeof child === 'object') {
        changed = (await updateObjectIds(child, ctx)) || changed;
      }
      continue;
    }

    const originalValue = value[key];
    const ids = normalizeIds(originalValue);
    const newIds = await fetchMappedIds(ids, rule, ctx);
    const targetKey = rule.targetKey(key);

    if (targetKey !== key) {
      delete value[key];
    }

    value[targetKey] = formatIdsLikeOriginal(originalValue, newIds);
    changed = true;
  }

  return changed;
}

async function processFiles(options) {
  const apiBase = normalizeApiBase(options?.apiBase ?? DEFAULT_API_BASE);
  const baseDir = options?.baseDir;
  const dryRun = Boolean(options?.dryRun);
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const log = options?.log ?? true;

  if (!fetchImpl) {
    throw new Error('fetch is not available; provide fetchImpl in options.');
  }

  const files = await walkDir(baseDir);
  const ctx = {
    apiBase,
    fetchImpl,
    cache: new Map(),
  };

  let changedFiles = 0;

  for (const filePath of files) {
    const data = await readJson(filePath);
    const changed = await updateObjectIds(data, ctx);
    if (changed) {
      changedFiles += 1;
      await writeJson(filePath, data, dryRun);
    }
  }

  if (log) {
    const runLabel = dryRun ? 'Dry run' : 'Completed';
    // eslint-disable-next-line no-console
    console.log(`${runLabel}: ${changedFiles}/${files.length} files updated.`);
  }

  return { files, changedFiles, dryRun };
}

function parseArgs(argv) {
  const args = [...argv];
  const parsed = {
    apiBase: DEFAULT_API_BASE,
    baseDir: null,
    dryRun: false,
    help: false,
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg === '--api-base') {
      parsed.apiBase = args.shift();
      continue;
    }
    if (arg === '--dir') {
      parsed.baseDir = args.shift();
      continue;
    }
  }

  return parsed;
}

function printHelp(defaultDir) {
  const text = [
    'Usage: node data/swapi/updateIds.js [options]',
    '',
    'Options:',
    '  --dir <path>       Root directory to scan for *v2.json files.',
    '  --api-base <url>   API base URL (default: http://localhost:3000/v1).',
    '  --dry-run          Skip writing files; still calls the API.',
    '  -h, --help         Show this help message.',
    '',
    `Default directory: ${defaultDir}`,
  ].join(os.EOL);

  // eslint-disable-next-line no-console
  console.log(text);
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultDir = path.join(scriptDir, 'normalize');
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp(defaultDir);
    return;
  }

  const baseDir = args.baseDir
    ? path.resolve(process.cwd(), args.baseDir)
    : defaultDir;

  await processFiles({
    apiBase: args.apiBase,
    baseDir,
    dryRun: args.dryRun,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  });
}

export { processFiles, updateObjectIds, normalizeIds, fetchMappedIds };

