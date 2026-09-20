# Free Job API Research — US ServiceNow Postings

Researched 2026-09-20 via live `curl` tests. Verdicts below are from real requests, not docs alone.

---

## 1. Jobicy ⭐ BEST PICK

- **Endpoint:** `GET https://jobicy.com/api/v2/remote-jobs?tag=servicenow`
- **Example curl:**
  ```bash
  curl "https://jobicy.com/api/v2/remote-jobs?tag=servicenow"
  ```
- **Auth:** None (keyless). Only requirement: credit Jobicy with a link and route apply buttons to the original URL.
- **Free limits:** No published rate limit; it is a public feed. Be polite (one call per scan run).
- **Sample result for "servicenow":** **19 jobs, all 19 genuinely mention ServiceNow** (in description or employer). Examples: "Experienced Information Systems Architect" (Gainwell Technologies), 2 roles at **ServiceNow itself** (Senior Solution Sales Executive, Customer Success Manager – Moveworks).
- **US coverage:** Strong — geo field is `USA` or `Canada, USA` for most results. `tag=` keyword filtering **actually works** (untagged feed = 200 jobs).
- **Caveat:** Remote-only listings. No keyword-in-title param, but tag filtering is effective.

## 2. USAJOBS (federal) ⭐ BEST PICK (with free key)

- **Endpoint:** `GET https://data.usajobs.gov/api/search?Keyword=ServiceNow`
- **Example curl (once keyed):**
  ```bash
  curl -H 'Host: data.usajobs.gov' \
       -H "User-Agent: you@example.com" \
       -H "Authorization-Key: YOUR_KEY" \
       "https://data.usajobs.gov/api/search?Keyword=ServiceNow&ResultsPerPage=50"
  ```
- **Auth: YES — free key required.** Verified live:
  - No headers → **403 Access Denied** (Akamai edge block)
  - Browser-like User-Agent only → **401 Unauthorized** (this is the API telling you the key is missing)
  - With key + correct headers → 200 (verified by community fixtures, not re-tested here)
- **How to get the free key:** Register at **https://developer.usajobs.gov/apirequest/** — fill in email + org name; the Authorization-Key arrives by email within minutes. No approval process, no credit card. Every request must then send three headers: `Host: data.usajobs.gov`, `User-Agent: <your registered email>` (this inverted convention causes nearly every first-time 401), `Authorization-Key: <key>`.
- **Free limits:** ~1,000 requests/hour; ResultsPerPage up to 500. No billing, no paid tier — genuinely free.
- **US coverage:** 100% US — this is the federal government board (agencies, DOD, VA, etc.). Federal ServiceNow roles (admins, developers, architects) post here regularly. **Commercial-use restriction:** API terms prohibit reselling/renting/derivative works and bind data to the registered org's use — fine for personal job hunting, not for a commercial product.
- **Caveat:** Federal-only, so it misses the commercial market entirely. Best paired with another source.

## 3. Adzuna (best commercial-US breadth — needs free app key)

- **Endpoint:** `GET https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=...&app_key=...&what=servicenow&results_per_page=50`
- **Auth: YES — free `app_id` + `app_key` as query params.** Verified live: calling without keys → **HTTP 400** with Adzuna's error page.
- **How to get free keys:** Sign up at https://developer.adzuna.com/signup (no credit card) → create an app under "My Apps" → copy App ID + App Key. ~2 minutes.
- **Free-tier limits (from ToS):** 25 requests/min · 250/day · 1,000/week · **2,500/month**. `results_per_page` max 50. Generous enough for several daily scans of 1–2 queries × 1–2 pages.
- **US coverage:** Excellent in principle — Adzuna is an aggregator (pulls from many US boards), has a dedicated `/jobs/us/` endpoint, and supports `what=servicenow` + `where=`/`location0..7`/`max_days_old` filters. Not sample-counted here (no key registered), but it is the broadest free commercial-US coverage available.
- **Caveats:** Descriptions truncated to 500 chars; US salary fields are often `salary_is_predicted` estimates rather than real ranges; ToS says non-publishing research use is a 14-day trial and ongoing use needs written consent — fine for personal job hunting, gray for publishing results.

## 4. Remotive — works but keyword search is unreliable

- **Endpoint:** `GET https://remotive.com/api/remote-jobs?search=servicenow`
- **Example curl:**
  ```bash
  curl "https://remotive.com/api/remote-jobs?search=servicenow"
  ```
- **Auth:** None.
- **Free limits:** Community notes say ~4 calls/day max and block if >2 calls/min — **keep to a daily cron, never a loop**.
- **Sample result:** 20 jobs returned, but **`search=servicenow` is ignored** — the same 20 recent jobs come back with or without the param, and **0 mention ServiceNow** anywhere. Keyword search does not function; you'd have to page the whole feed and filter client-side.
- **US coverage:** Remote-only; ~half the returned jobs accept US candidates (`candidate_required_location` includes USA).
- **Verdict:** Usable as a raw remote feed, but useless for targeted "servicenow" queries via the API.

## 5. Arbeitnow — wrong geography, no search

- **Endpoint:** `GET https://www.arbeitnow.com/api/job-board-api`
- **Auth:** None. HTTP 200, 250 jobs per response.
- **Sample result:** `?search=servicenow` is **silently ignored** (still returns the full 250); 0 mention ServiceNow, 0 US locations — all jobs are Germany/EU.
- **Verdict:** Not useful for US ServiceNow. Skip.

## 6. The Muse — huge US board, no keyword search

- **Endpoint:** `GET https://www.themuse.com/api/public/jobs?page=0`
- **Auth:** None. HTTP 200, 413,461 total jobs (all US).
- **Sample result:** Neither `?search=servicenow` nor `?q=servicenow` filters anything — total stays 413,461 and 0 of the first 20 mention ServiceNow. The v2 public API supports category/company/level/location filters but **no free-text search**.
- **Verdict:** Huge US coverage, but without keyword search you'd need to bulk-fetch and filter locally — expensive at scale (20/page × 20k+ pages). Skip as a primary source.

## 7. Himalayas — huge remote feed, no keyword search

- **Endpoint:** `GET https://himalayas.app/jobs/api` (cursor-paginated, 20/page)
- **Auth:** None. HTTP 200, **105,548** total remote jobs.
- **Sample result:** `?search=` / `?keyword=` / `?query=` / `?title=` all ignored — total stays ~105k. Client-side filtering only.
- **Verdict:** Remote-only anyway; no server-side keyword search. Skip as primary, keep as a fallback raw feed if needed.

## 8. RemoteOK — tiny feed right now, no ServiceNow

- **Endpoint:** `GET https://remoteok.com/api` (needs a browser-like User-Agent header)
- **Auth:** None, but the API ToS requires linking back to remoteok.com.
- **Sample result:** Feed currently holds only **99 jobs**, 0 mention ServiceNow. `?tag=servicenow` returned just the legal notice (0 jobs).
- **Verdict:** Feed is thin right now; not a reliable ServiceNow source today.

## 9. Findwork — requires a free token (untested)

- **Endpoint:** `GET https://findwork.dev/api/jobs/?search=servicenow`
- **Auth: YES — API token required.** Verified live: `{"detail":"Authentication credentials were not provided."}` → HTTP 401. Free tokens are available from findwork.dev signup (tech-only remote jobs). Not registered in this research.
- **Verdict:** Worth one more test after a 2-minute signup; remote/tech focus could yield ServiceNow hits, but it's remote-only.

## 10. JSearch (RapidAPI) — SKIPPED

Paid-only (RapidAPI subscription). Out of scope per brief.

---

## Ranked recommendation (zero cost, US ServiceNow focus)

| Rank | API | Why |
|---|---|---|
| 🥇 | **Adzuna** (`/jobs/us/search`) | Broadest **commercial US** coverage, real keyword + location filtering, generous free tier (2,500/mo). Cost: 2-min free signup. |
| 🥈 | **Jobicy** (`tag=servicenow`) | Zero signup, verified **19 live ServiceNow postings** with strong USA geo today. Remote-only, but the tag search actually works. |
| 🥉 | **USAJOBS** | 100% US and free forever, but **federal jobs only** — captures the federal ServiceNow market (DOD/VA/agency IT roles) the others miss. Cost: 2-min free key. |

**Suggested minimal pipeline (all free):**
1. Daily: Adzuna `us` query `what=servicenow` (1 call/day = ~30/mo, far under quota).
2. Daily: Jobicy `tag=servicenow` (1 call/day, no auth).
3. Daily or weekly: USAJOBS `Keyword=ServiceNow` (1 call, free key).

Optional extras: register a Findwork token and re-test; use **Greenhouse/Lever/Ashby** per-company ATS boards (keyless, highest freshness) for a watchlist of ~10–20 known ServiceNow employers — e.g. consultancies and ServiceNow partners — as a high-signal supplement.

*Raw curl outputs saved in `/tmp/` during research (arbeit.json, remotive.json, muse.json, him.json, remoteok2.json, jobicy.json, usajobs_nokey.txt).*
