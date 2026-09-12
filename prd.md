# PRD — A9: The Polite Scraper (JavaScript Lane)

## 1. Overview
Build a small, polite scraping pipeline against **Books to Scrape**, a public practice sandbox. The pipeline downloads the first 3 catalogue pages, visits all 60 book detail pages, turns messy HTML into clean validated JSON, survives broken pages without crashing, and ends every run with an honest report.

Pipeline shape: **classify → fetch → extract → normalize → validate → store → report**.

## 2. Goal
- Discover exactly 60 unique book URLs from 3 catalogue pages.
- Extract 8 raw fields per book, normalize into a typed schema, validate before storing.
- `output/books.json` has exactly 60 unique, valid records — idempotent across reruns.
- One deliberately broken URL is logged and skipped without killing the run.
- `output/run-report.json` reports honest counts after every run.
- Publish to a public GitHub repo with 7+ meaningful commits and a 5-minute README.

## 3. Tech Stack
- **Runtime:** Node.js 20+
- **HTTP:** built-in `fetch`
- **HTML parsing:** Cheerio
- **Schema validation:** Zod
- **Output:** built-in `fs` → JSON files
- **Target:** `https://books.toscrape.com` (practice sandbox only)
- **Publishing:** Git + GitHub

## 4. Core Principles (must hold throughout)
1. **Check before you collect** — classify the target before writing any request code.
2. **Be a polite guest** — identifying user-agent, timeout, delay, cache, respect `robots.txt`.
3. **Trust nothing you scraped** — every record is validated before it's stored; a web page is untrusted input.

## 5. Raw Record Shape (per book, Stage 3 output)
```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "...",
  "source_page": "https://books.toscrape.com/catalogue/page-1.html",
  "fetched_at": "2026-08-06T10:00:00Z"
}
```
`description` is `null` (never invented) when absent. `source_page` + `fetched_at` are provenance and must never be overwritten.

## 6. Clean/Validated Record Shape (Stage 4 output)
- `price_text` → normalized `price_gbp` (number), original text kept alongside.
- `product_url` (absolute) is the record's **canonical URL** / identity — dedupe on this.
- Schema defined once with Zod: required fields, types, `description` optional.
- Records failing validation go to `errors.json` with a reason — never into `books.json`.

## 7. Politeness Requirements (apply to every real request)
- Identifying `User-Agent`, e.g. `FlyRankInternshipA9/1.0 (+link-to-your-repo)`.
- Request timeout — never wait forever.
- Check status code before parsing; only `200` is treated as success.
- Minimum 500ms delay between real requests; cached pages need no delay.
- Cache every fetched page to disk (`cache/`) and read from cache during development.
- Retry `5xx`/timeout once after a short wait; never retry `404` or `403`.

## 8. Implementation Stages

### Stage 0 — Check Before You Collect (~30 min)
- Create `scraper/` with `README.md`, `.gitignore`, one entry file (`src/index.js`).
- Read `toscrape.com` to confirm it's a practice sandbox.
- Fetch `https://books.toscrape.com/robots.txt` once; record the result (or "no robots file found").
- Add a "Target classification" section to the README: site, why, scope (first 3 catalogue pages only), data collected, and why it's appropriate.
- **Checkpoint:** README names the target, scope, robots result, and includes: *"I will not reuse this code on another site without checking its rules and terms first."*
- **Commit:** `Stage 0: classify scraping target`

### Stage 1 — Fetch Once, Cache Once (~45 min)
- Download catalogue page 1 with identifying user-agent, timeout, status check.
- Save HTML to `cache/catalogue-page-1.html`.
- On subsequent runs, read from cache instead of re-requesting.
- **Checkpoint:** first run prints `FETCH` + creates file; second run prints `CACHE HIT`; both report response size; neither dumps full HTML to terminal.
- **Commit:** `Stage 1: fetch and cache HTML`

### Stage 2 — Find All Three Pages (~45 min)
- Parse saved page with Cheerio.
- Collect every book link on page 1; convert relative → absolute URLs using `new URL(href, pageUrl)` (never string concatenation).
- Follow the catalogue's own "next" link through page 3, then stop (don't hardcode 60 links).
- ≥500ms delay between real requests; no delay for cached pages.
- Deduplicate links.
- **Checkpoint:** script prints `catalogue_pages=3`, `discovered=60`, `unique_urls=60`; rerun reports the same numbers, mostly from cache.
- **Commit:** `Stage 2: discover three catalogue pages`

### Stage 3 — Extract the Raw Records (~1h15)
- For each of the 60 book pages: fetch+cache with same politeness rules as Stage 1.
- Target selectors at the product area, not the whole document.
- Missing description → `null`, never invented text.
- Every record includes `source_page` and `fetched_at`.
- **Checkpoint:** prints one complete raw record (all 8 keys) + `detail_pages=60`.
- **Commit:** `Stage 3: extract book details`

### Stage 4 — Clean It, Check It, Store It (~1h)
- Normalize `price_text` → numeric `price_gbp`; keep raw text alongside.
- Use absolute `product_url` as canonical identity; dedupe.
- Define schema with Zod (required fields, types, `description` optional).
- Validate every record; failures → `errors.json` with reason.
- Write valid records to `output/books.json`.
- Verify idempotency: two runs → still exactly 60 records, not 120.
- **Checkpoint:** `books.json` has exactly 60 records, every `price_gbp` is numeric, every URL starts with `https://`; still 60 after a second run.
- **Commit:** `Stage 4: validate normalized records`

### Stage 5 — One Bad Page Must Not Kill the Run (~45 min)
- Handle each page independently — a broken page is logged and skipped, not fatal.
- Retry once on timeout/`5xx`; never retry `404`/`403`.
- Write `output/run-report.json` at end of every run: start time, duration, pages fetched, cache hits, valid records, invalid records, failed pages.
- Prove it: add one made-up book URL to the list on purpose and run (break things on your own side only).
- **Checkpoint:** with one fake URL added, run still finishes; `books.json` still has the 60 good records; `run-report.json` shows `failed_pages: 1`.
- **Commit:** `Stage 5: survive failures, report the run`

> Don't gold-plate Stage 5 — next week's assignment (A16) adds full retry-with-backoff, structured logs, and hidden-API discovery on top of this foundation.

### Stage 6 — Publish the Evidence (~45 min, required)
- Push to a public GitHub repo; commit code + one sample output, not hundreds of cached HTML files (`cache/` in `.gitignore`).
- Finish README: target classification, one copy-pasteable run command, lane + install steps, record schema, politeness rules (user-agent, delay, timeout, cache), one honest limitation.
- Paste one real `run-report.json` into the README; add one sentence on why no browser was needed (data is already in server-sent HTML).
- Add a short ethics note: use an official API when one exists; never bypass logins/paywalls/blocks; collect only what's needed.
- **Checkpoint:** a stranger can clone, run one documented command, and get `books.json` + `run-report.json` in under 5 minutes; `git log --oneline` shows 7+ meaningful commits.
- **Commit:** `Stage 6: publish scraper evidence`

### ★ Bonus Stage — The AI Rematch (~1h, optional)
- From memory (no peeking at this doc), write a prompt describing: target + 3-page scope, 8 raw fields, clean schema, caching, delay, user-agent, timeout, validation rule, no-duplicates rule, broken-page handling, run report, language.
- Generate the AI's version in `ai-version/` or a separate branch — keep it isolated from your hand-built code.
- Run it against your own Stage 2–5 checkpoints: collects all 60? rerun-safe? survives a broken page?
- Write an "AI vs me" README section: what the AI did better (and do you understand that code?), what it got wrong/silently skipped, what your prompt forgot to say.
- Regenerate once after improving the prompt; note what changed.
- **Checkpoint:** README has the full prompt, checkpoint results for both versions, and ≥3 concrete differences.
- **Commit:** `Bonus: AI vs me`

## 9. Definition of Done (acceptance criteria)
- [ ] One documented command processes the first 3 catalogue pages and discovers 60 unique book URLs
- [ ] Every detail page produces the 8 raw fields plus numeric `price_gbp`
- [ ] Records are schema-validated before storage; failures land in `errors.json` with a reason
- [ ] `output/books.json` holds exactly 60 unique records after first run and after rerun
- [ ] Every real request: identifying user-agent, timeout, ≥500ms delay, status check; dev reads from cache
- [ ] README documents target classification + robots check result
- [ ] One deliberately broken URL is logged and skipped; run finishes; good records survive
- [ ] `output/run-report.json` reports counts, failures, cache hits, duration
- [ ] Public GitHub repo, 7+ meaningful commits, README a stranger can run in under 5 minutes

## 10. Optional Stretch Goals
- CSV export (`books.csv`) from validated records, noting flattened values.
- Change detection: hash each record, report new/changed/unchanged/gone vs last run.
- Tiny local HTML dashboard: record count, price range, failures, freshness.
- Selector fixtures: 2 saved HTML files proving the parser handles missing description + extra whitespace.
- Real retry rules: exponential backoff with jitter, respect `Retry-After`, structured logs (URL, status, attempt).
- Browser cost comparison: fetch `quotes.toscrape.com/js` with plain HTTP (view source first) vs Playwright; README note on time/memory and why the core assignment needed no browser.
- 5+ parser unit tests: price normalization, relative→absolute URLs, missing description, duplicate URLs, one malformed fixture.
- Background execution (if A7 complete): each page as a queued job, concurrency cap, idempotent writes.
- Local AI enrichment via Ollama: add category + short summary from validated descriptions, schema-forced output, kept separate from scraped facts.

## 11. Non-Goals
- No scraping of any site other than the Books to Scrape sandbox.
- No paid API, proxy, cloud service, or credit card required.
- No browser automation in the core assignment (data is already in server-sent HTML).
- No production-grade retry/backoff — that's next week's assignment (A16).

## 12. Suggested File Structure
```
scraper/
├── .gitignore              # excludes cache/
├── README.md
├── src/
│   ├── index.js            # entry point, orchestrates the pipeline
│   ├── fetcher.js           # polite fetch + cache logic
│   ├── discover.js          # Stage 2: catalogue crawl, link collection
│   ├── extract.js           # Stage 3: Cheerio selectors → raw records
│   ├── normalize.js         # Stage 4: price parsing, canonical URLs
│   ├── schema.js             # Zod schema definition
│   └── report.js             # Stage 5: run-report.json writer
├── cache/                   # gitignored, saved HTML pages
├── output/
│   ├── books.json
│   ├── errors.json
│   └── run-report.json
└── ai-version/               # bonus stage, isolated AI-generated code
```
