import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.resolve('cache');
await fs.mkdir(CACHE_DIR, { recursive: true });

let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeFilename(url) {
  return encodeURIComponent(url).replace(/%/g, '_');
}

export async function politeFetch(url, { timeout = 10000, useCache = true, minDelayMs = 500, retryOn5xx = true, userAgent } = {}) {
  const cachePath = path.join(CACHE_DIR, safeFilename(url) + '.html');
  // Try cache
  try {
    if (useCache) {
      const txt = await fs.readFile(cachePath, 'utf8');
      return { fromCache: true, status: 200, text: txt };
    }
  } catch (e) {
    // cache miss -> continue
  }

  // enforce min delay
  const since = Date.now() - lastRequestAt;
  if (since < minDelayMs) await sleep(minDelayMs - since);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  lastRequestAt = Date.now();

  const headers = { 'User-Agent': userAgent || process.env.FLY_USER_AGENT || 'FlyRankInternshipA9/1.0 (+https://github.com/your-repo)' };

  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(id);
    const status = res.status;
    if (status === 200) {
      const text = await res.text();
      // save cache
      try { await fs.writeFile(cachePath, text, 'utf8'); } catch (e) {}
      return { fromCache: false, status, text };
    }

    // retry once on 5xx or on aborted
    if (retryOn5xx && (status >= 500 && status < 600)) {
      await sleep(1000);
      const res2 = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(id);
      if (res2.status === 200) {
        const text = await res2.text();
        try { await fs.writeFile(cachePath, text, 'utf8'); } catch (e) {}
        return { fromCache: false, status: res2.status, text };
      }
      return { fromCache: false, status: res2.status, text: null };
    }

    return { fromCache: false, status, text: null };
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      // retry once
      if (retryOn5xx) {
        await sleep(1000);
        try {
          const res2 = await fetch(url, { headers });
          if (res2.status === 200) {
            const text = await res2.text();
            try { await fs.writeFile(cachePath, text, 'utf8'); } catch (e) {}
            return { fromCache: false, status: 200, text };
          }
          return { fromCache: false, status: res2.status, text: null };
        } catch (e) {
          return { fromCache: false, status: 0, text: null, error: e.toString() };
        }
      }
    }
    return { fromCache: false, status: 0, text: null, error: err.toString() };
  }
}
