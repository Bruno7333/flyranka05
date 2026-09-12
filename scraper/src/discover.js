import { load } from 'cheerio';
import { politeFetch } from './fetcher.js';

export async function discoverCataloguePages(startUrl, maxPages = 3) {
  const discovered = new Set();
  const pages = [];
  let url = startUrl;
  let pageCount = 0;

  while (url && pageCount < maxPages) {
    const res = await politeFetch(url);
    if (res.status !== 200 || !res.text) throw new Error(`Failed to fetch catalogue page ${url} status=${res.status}`);
    pages.push({ url, text: res.text });
    const $ = load(res.text);
    // Collect book links
    $('article.product_pod h3 a').each((i, el) => {
      const href = $(el).attr('href');
      try { const abs = new URL(href, url).href; discovered.add(abs); } catch (e) {}
    });

    // find next link
    const next = $('li.next a').attr('href');
    url = next ? new URL(next, url).href : null;
    pageCount += 1;
  }

  return { pages, discovered: Array.from(discovered).sort() };
}
