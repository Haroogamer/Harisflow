# Job hunter — free ServiceNow job radar

Twice-daily scan for US ServiceNow roles. Zero paid APIs.

## How it works

1. **ATS boards** (`boards.py`): crawls 2,249 verified company career boards
   directly (Greenhouse 216, Lever 269, Ashby 1,764) — free public JSON APIs.
   ServiceNow-heavy employers (consultancies, federal contractors) are
   crawled first.
2. **Free job APIs** (`freeapis.py`): Jobicy (keyless), Adzuna + USAJobs
   (free keys via `.env`).
3. **Matching** (`match.py`): ServiceNow title terms + US-location filter,
   ported from the Harisflow rules.
4. **Dedupe** (`store.py`): SQLite, keyed by content hash — a job alerts once.
5. **Alerts** (`notify.py`): Discord webhook embed per new match.

## Setup

```bash
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in keys (all free)
./venv/bin/python run.py --dry-run --limit 5   # test without notifying
./venv/bin/python run.py                        # full run, notifies Discord
```

## Schedule (2x daily)

Cron runs `run.sh` at 8am and 6pm America/Toronto:
```bash
0 8,18 * * * /home/hatch/workspace/jobhunter/run.sh >> /home/hatch/workspace/jobhunter/cron.log 2>&1
```

## Files

- `companies.json` — 2,249 verified boards, hottest first
- `jobs.db` — SQLite: every job seen, dedupe + run history
- `research/` — free-API verification notes, ATS gap analysis, raw lists

## Why this replaced the old version

The Harisflow (Next.js) hunter died on SerpAPI's free tier: 12+ metered
searches per discovery run = quota gone after 2–5 runs, then zero new
postings forever. This version's discovery is the ATS boards themselves —
unlimited and free — so it can't starve.
