# Polite Scraper — Books to Scrape (Stage A9)

Target: https://books.toscrape.com/

Scope: first 3 catalogue pages only; discover ~60 unique book detail pages.

Robots check: the scraper fetches `/robots.txt` once and records the result in `cache/robots.txt` or notes "no robots file found" in this README when run.

Data collected: per-book raw fields: `title`, `product_url`, `price_text`, `availability_text`, `rating_text`, `description` (nullable), `source_page`, `fetched_at`.

Politeness rules (implemented):

- Identifying `User-Agent` header: `FlyRankInternshipA9/1.0 (+your-repo-url)` — set `FLY_USER_AGENT` env to override.
- Request timeout and one retry on `5xx`/timeout.
- Minimum 500ms delay between real HTTP requests; cached pages bypass delay.
- Cache HTML pages to `cache/` and read from cache when present.
- Respect status codes: only `200` is success.

I will not reuse this code on another site without checking its rules and terms first.

Run (from `scraper/`):

```bash
npm install
node src/index.js
```
