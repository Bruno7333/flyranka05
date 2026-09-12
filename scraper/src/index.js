import fs from 'fs/promises';
import path from 'path';
import { politeFetch } from './fetcher.js';
import { discoverCataloguePages } from './discover.js';
import { extractRawFromDetail } from './extract.js';
import { normalizeRecord } from './normalize.js';
import { validateBook } from './schema.js';
import { writeOutputs } from './report.js';

const BASE = 'https://books.toscrape.com/';
const START = new URL('/catalogue/page-1.html', BASE).href;

function now() { return new Date().toISOString(); }

async function fetchRobots() {
  try {
    const robotsUrl = new URL('/robots.txt', BASE).href;
    const res = await politeFetch(robotsUrl, { useCache: true });
    if (res.status === 200 && res.text) {
      await fs.writeFile(path.resolve('cache', 'robots.txt'), res.text, 'utf8');
      return { found: true, status: 200 };
    }
    return { found: false, status: res.status };
  } catch (e) {
    return { found: false, error: e.toString() };
  }
}

async function run() {
  const startedAt = now();
  const runReport = { start: startedAt, duration_s: 0, pages_fetched: 0, cache_hits: 0, valid: 0, invalid: 0, failed_pages: 0 };

  const robots = await fetchRobots();

  // Stage 2: discover
  const discoveredResult = await discoverCataloguePages(START, 3);
  const bookUrls = discoveredResult.discovered;

  const rawRecords = [];
  const errors = [];

  for (const url of bookUrls) {
    const fetchedAt = now();
    try {
      const res = await politeFetch(url);
      if (res.fromCache) runReport.cache_hits += 1;
      runReport.pages_fetched += res.fromCache ? 0 : 1;
      if (res.status !== 200 || !res.text) {
        runReport.failed_pages += 1;
        errors.push({ url, reason: `status=${res.status}` });
        continue;
      }
      const raw = extractRawFromDetail(res.text, url, START, fetchedAt);
      rawRecords.push(raw);
    } catch (e) {
      runReport.failed_pages += 1;
      errors.push({ url, reason: e.toString() });
    }
  }

  // Stage 4: normalize + validate
  const validated = [];
  for (const raw of rawRecords) {
    const norm = normalizeRecord(raw);
    const v = validateBook(norm);
    if (v.success) {
      validated.push(v.data);
      runReport.valid += 1;
    } else {
      runReport.invalid += 1;
      errors.push({ url: raw.product_url, reason: v.error });
    }
  }

  // Deduplicate by product_url
  const uniq = [];
  const seen = new Set();
  for (const b of validated) {
    if (!seen.has(b.product_url)) { seen.add(b.product_url); uniq.push(b); }
  }

  const endedAt = now();
  runReport.duration_s = (Date.now() - Date.parse(startedAt)) / 1000;

  await writeOutputs({ books: uniq, errors, report: { ...runReport, robots } });

  console.log(`Done: valid=${runReport.valid} invalid=${runReport.invalid} failed=${runReport.failed_pages}`);
}

run().catch((e) => { console.error('Fatal', e); process.exit(1); });
