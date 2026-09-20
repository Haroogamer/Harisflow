# ATS Gap Analysis — platforms outside the current pipeline

Pipeline already crawls: Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters,
Dayforce, Oracle Cloud (HCM), UKG/Ultipro.

The platforms below are used by LARGE employers that hire ServiceNow talent
(consultancies, SIs, tech vendors, Fortune 500 IT orgs) but have **no direct
board-crawl adapter**. Postings at these companies are reachable today only via
free job APIs (e.g. Adzuna, JSearch) or manual careers-site checks.

Research date: 2026-09-20. Sources: kalil0321/ats-scrapers per-ATS company lists,
job-hunter-toolkit ATS survey, ever-jobs slug directory, plus web verification.

---

## 1. Phenom People

**What it is:** AI-driven talent-experience platform. Companies run their branded
careers front-end on Phenom (`careers.<company>.com/.../search-results`), often with
the actual application hosted on a different backend (Workday, Taleo, etc.).

**Why it can't be crawled directly:** No documented public cross-tenant job API.
Search endpoints are per-tenant and scoped by `(locale, country)`; the page is a
JS SPA and several tenants bot-block plain fetches. The only semi-structured route
is parsing the server-rendered `phApp.ddo` jobs JSON island per tenant — doable per
company with a browser UA, but there is no uniform board API like Ashby/Greenhouse.
Many Phenom front-ends' `applyUrl` points back to a Workday tenant, so Phenom is
frequently a *discovery* layer over an already-covered ATS — but the discovery
step itself has no adapter.

**Notable ServiceNow employers on Phenom:**
- Cisco — careers.cisco.com (Phenom front; cisco.wd5 Workday backend also exists)
- Adobe — careers.adobe.com
- Snowflake — careers.snowflake.com
- HPE — careers.hpe.com
- BCG — careers.bcg.com (consulting)
- Mastercard — careers.mastercard.com (applyUrl → mastercard.wd1 Workday)
- United Airlines — careers.united.com
- Hilton — jobs.hilton.com
- Truist, PNC, U.S. Bank, BMO — careers.truist.com, careers.pnc.com, careers.usbank.com, jobs.bmo.com (banks)
- Humana — careers.humana.com; CVS Health — jobs.cvshealth.com (→ cvshealth.wd1 Workday); Cigna Group — jobs.thecignagroup.com (healthcare)
- GE Aerospace — careers.geaerospace.com; BAE Systems — jobs.baesystems.com; Thales — careers.thalesgroup.com; KBR — careers.kbr.com; ICF — careers.icf.com (aerospace/defense/consulting)
- TD SYNNEX — careers.tdsynnex.com (major ServiceNow partner/distributor)
- FIS, Fiserv, State Street, WEX, Morningstar — fintech/financial
- Thermo Fisher, Danaher, Lilly, Merck, Labcorp, Catalent, Fortrea, Zimmer Biomet, Avantor, Ecolab, Veralto — life sciences
- DuPont, PPG, ITW — industrials
- DocuSign — careers.docusign.com
- Southwest Airlines — careers.southwestair.com; Toyota — careers.toyota.com (→ toyota.wd503 Workday); Honda — careers.honda.com
- Philips, Roche, GE HealthCare — healthcare tech
- TJX, Dollar Tree, Circle K, Michaels — retail
- DHL, Kuehne+Nagel — logistics

**Priority for ServiceNow hiring:** HIGH — Cisco, TD SYNNEX, BCG, and the big
banks/healthcare orgs are all large IT employers where ServiceNow roles appear
frequently; they are invisible to the current board crawlers.

---

## 2. Oracle Taleo (legacy)

**What it is:** Oracle's legacy recruiting system (`<org>.taleo.net/careersection/...`),
still used by many large enterprises that haven't migrated to Oracle Recruiting Cloud.

**Why it can't be crawled directly:** Stateful JSF application (`jobdetail.ftl`,
`searchResults?org=...&cws=...`); no public REST/JSON job-listing API; requires
session cookies and per-org URL shapes. HTML scraping is brittle and login-walled
for applications.

**Notable ServiceNow employers on Taleo:**
- Kaiser Permanente — kp.taleo.net (confirmed live; SmartRecruiters cross-posts
  point at kp.taleo.net apply URLs). One of the largest US healthcare employers
  and a known ServiceNow customer.
- Marriott International — historically Taleo; now on a proprietary platform at
  careers.marriott.com (custom, still no public API).
- Many hospital systems, government agencies, and universities (smaller ServiceNow
  footprint individually, large in aggregate).

**Priority:** MEDIUM — Kaiser Permanente's postings are invisible to board crawlers.

---

## 3. SAP SuccessFactors

**What it is:** SAP's HCM suite; career sites are RMK-based (`jobs.<company>.com`,
`career{N}.successfactors.{com,eu}/career?company=<companyId>`).

**Why it isn't crawled directly (yet):** Unlike Taleo, SuccessFactors RMK *does*
expose a keyless XML endpoint —
`GET career{N}.successfactors.{com|eu}/career?company=<companyId>&career_ns=job_listing_summary&resultType=XML`
returning every open req — so it is technically crawlable, but the pipeline has no
adapter and tenancy is a non-guessable `(companyId, host)` pair (companyId is
case-sensitive, e.g. `nestleHRprdBX`; `career5.successfactors.com` is NXDOMAIN while
`.eu` is live). Needs a curated tenant registry first (community lists hold ~1,400 candidate
tenant pairs; each needs individual verification).

**Notable ServiceNow employers on SuccessFactors** (verified tenant triples from
community research):
- SAP itself — jobs.sap.com (large ServiceNow-adjacent ecosystem)
- Capgemini — `capgemitecP3` @ career5.successfactors.eu (~1,682 postings; top-5 global
  ServiceNow partner)
- Nestlé — `nestleHRprdBX` @ career2.successfactors.eu
- ExxonMobil — `exxonmobilP` @ career4.successfactors.com
- Bayer — jobs.bayer.com; BASF — basf.jobs; BioNTech — jobs.biontech.com
- Atos — jobs.atos.net (Atos/Eviden is a major ServiceNow partner in EU)
- L3Harris — jobs.l3harris.com; HII Technical Solutions — jobs.hii-tsd.com (defense)
- Volkswagen Group of America — careers.vw.com; BMW — jobs.bmwgroup.com
- Amkor Technology — career8.successfactors.com
- Wipro-scale Indian IT enterprises (per India ATS field guide)

**Priority:** HIGH — Capgemini is one of the largest ServiceNow employers in the
world and is entirely on SuccessFactors.

---

## 4. Eightfold.ai

**What it is:** AI talent-intelligence platform; companies host career sites at
`<slug>.eightfold.ai/careers` (sometimes on custom domains, e.g. careers.deere.com,
explore.jobs.netflix.net).

**Why it can't be crawled directly:** JS SPA with no documented public board API
comparable to Ashby/Greenhouse; per-tenant discovery required. (Eightfold is an
*overlay* — several tenants also keep a Workday backend, e.g. HP, NVIDIA.)

**Notable ServiceNow employers on Eightfold:**
- NTT DATA — nttdata.eightfold.ai (major global ServiceNow partner)
- Softtek — softtek.eightfold.ai (ServiceNow partner, Americas)
- Insight — insight.eightfold.ai (ServiceNow partner / reseller)
- Northrop Grumman — ngc.eightfold.ai (defense; also on Taleo/Workday per conflicting sources)
- CACI — caci.eightfold.ai (federal IT; ServiceNow-heavy)
- Citi — citi.eightfold.ai (also Radancy front at jobs.citi.com); Morgan Stanley — morganstanley.eightfold.ai; HSBC — hsbc.eightfold.ai
- Microsoft — microsoft.eightfold.ai (secondary; primary is custom careers.microsoft.com)
- NVIDIA — nvidia.eightfold.ai (also nvidia.wd5 Workday); Micron — micron.eightfold.ai (also micron.wd1 Workday)
- Starbucks, Ford, HP, Eaton, Qualcomm, Twilio, NetApp, PTC, SLB, GlobalFoundries, Lam Research, Applied Materials
- Amdocs, Trimble, UKG, Plexus, CoStar, Albemarle, Corteva, Fortive, Dolby
- AstraZeneca, Bristol Myers Squibb, Boston Scientific, Dexcom, Alnylam
- John Deere — careers.deere.com; Netflix — explore.jobs.netflix.net
- Liberty Mutual, New York Life, Vialto Partners

**Priority:** HIGH — NTT DATA, Softtek, Insight, and CACI are all significant
ServiceNow employers whose postings are not reachable through the current board
crawlers (only via Eightfold per-tenant discovery or job APIs).

---

## 5. Fully custom / proprietary career sites

No third-party ATS fingerprint; each needs a bespoke scraper. Postings reachable
only via free job APIs today.

- **Amazon** — amazon.jobs (custom)
- **Google** — careers.google.com (custom; embedded AF_initDataCallback data)
- **Microsoft** — careers.microsoft.com (custom; Eightfold as secondary layer)
- **Apple** — jobs.apple.com (custom)
- **Meta** — metacareers.com (custom)
- **Atlassian** — atlassian.com/company/careers (custom)
- **Salesforce** — salesforce.com/company/careers (custom front; salesforce.wd12 Workday backend)
- **Dropbox** — dropbox.jobs (custom)
- **SpaceX** — custom; **Tesla** — Workday (tesla:5:Tesla) per community lists
- **TCS** — NextStep portal (custom; largest Indian IT employer)
- **Marriott** — careers.marriott.com (proprietary)
- **Walmart** — proprietary front (also walmart.wd5 Workday per some sources — verify per requisition)

## 6. Other legacy enterprise ATS (smaller ServiceNow footprint, noted for completeness)

- **IBM BrassRing / Kenexa** (`sjobs.brassring.com`) — Lockheed Martin (conflicts with
  a community list claiming `lmco:5:LMCareers` Workday — likely BrassRing for US
  hiring), Home Depot hourly roles. No public API.
- **Avature** (`*.avature.net`) — Ally Financial, Lockheed Martin talent network. CRM-style; no public job API.
- **Radancy** (`jobs.citi.com/search-jobs/results?...` JSON-in-HTML endpoint) — Citi.
  Recruitment-marketing layer; per-tenant endpoint shapes.

---

## Recommendations for the pipeline

1. **Phenom** — biggest single gap by employer count. Per-tenant widget endpoints
   (`/{country}/{lang}/search-results` + `phApp.ddo` JSON island) are parseable with a
   browser UA; tenants where `applyUrl` → Workday can be de-duped against the Workday crawl.
2. **SuccessFactors RMK XML** — the only gap with a *keyless* structured endpoint;
   cheapest to add after a tenant registry (companyId, host) is built.
3. **Eightfold** — per-tenant SPA API discovery; prioritize NTT DATA / Softtek / Insight / CACI.
4. **Taleo / BrassRing / Avature / custom** — no structured route; leave to free job APIs.
