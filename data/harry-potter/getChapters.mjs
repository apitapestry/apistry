import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE_URL = process.env.POTTERDB_BASE_URL ?? "https://api.potterdb.com";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_CANDIDATES = [
  path.join(__dirname, "extract", "harry-potter-books.v1.json"),
  path.join(__dirname, "extract", "harry-potter-books-v1.json"),
];
const OUTPUT_PATH = path.join(__dirname, "extract", "harry-potter-chapters-v1.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveInputPath() {
  for (const candidate of INPUT_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    `Could not find input file. Tried: ${INPUT_CANDIDATES.map((file) => path.basename(file)).join(", ")}`,
  );
}

async function fetchJsonWithRetry(url, { retries = 4, timeoutMs = 20000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;

    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }

      clearTimeout(timeout);
      const backoffMs = 400 * 2 ** attempt;
      await sleep(backoffMs);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) {
      return await response.json();
    }

    const shouldRetry = response.status >= 500 || response.status === 429;
    const httpError = new Error(`HTTP ${response.status} for ${url}`);

    if (!shouldRetry || attempt === retries) {
      throw httpError;
    }

    lastError = httpError;
    const backoffMs = 400 * 2 ** attempt;
    await sleep(backoffMs);
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

function toAbsoluteUrl(url) {
  return new URL(url, API_BASE_URL).toString();
}

async function fetchAllChaptersForBook(bookId) {
  const chapters = [];
  const visited = new Set();
  let nextUrl = toAbsoluteUrl(`/v1/books/${bookId}/chapters`);

  while (nextUrl) {
    if (visited.has(nextUrl)) {
      throw new Error(`Pagination loop detected for book ${bookId}`);
    }

    visited.add(nextUrl);
    const payload = await fetchJsonWithRetry(nextUrl);
    const pageData = Array.isArray(payload?.data) ? payload.data : [];

    for (const chapter of pageData) {
      chapters.push(chapter); // Do not add bookId
    }

    nextUrl = payload?.links?.next ? toAbsoluteUrl(payload.links.next) : null;
  }

  return chapters;
}

async function main() {
  const inputPath = await resolveInputPath();
  const fileText = await readFile(inputPath, "utf8");
  const books = JSON.parse(fileText);

  if (!Array.isArray(books)) {
    throw new Error(`Expected an array in ${path.basename(inputPath)}`);
  }

  const allChapters = [];
  const failures = [];

  for (const [index, book] of books.entries()) {
    const bookId = book?.id;

    if (!bookId) {
      failures.push({
        index,
        reason: "Missing book id",
      });
      continue;
    }

    try {
      const chapters = await fetchAllChaptersForBook(bookId);
      allChapters.push(...chapters);
      console.log(`[${index + 1}/${books.length}] ${bookId}: ${chapters.length} chapters`);
    } catch (error) {
      failures.push({
        index,
        bookId,
        reason: error instanceof Error ? error.message : String(error),
      });
      console.error(`[${index + 1}/${books.length}] ${bookId}: failed (${failures.at(-1).reason})`);
    }
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(allChapters, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${allChapters.length} chapters to ${OUTPUT_PATH}`);

  if (failures.length > 0) {
    console.error(`Completed with ${failures.length} failure(s):`);
    for (const failure of failures) {
      console.error(`- index=${failure.index} bookId=${failure.bookId ?? "n/a"} reason=${failure.reason}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
