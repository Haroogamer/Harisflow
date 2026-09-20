#!/usr/bin/env python3
"""Ashby phase 2: verify remaining curated slugs, checkpointed. Polite: 0.25s sleep."""
import json, time, csv, os, urllib.request, urllib.error

BASE = os.path.expanduser('~/workspace/jobhunter/research')
OUT = f'{BASE}/companies_ashby.json'
CKPT = f'{BASE}/_cache/ashby_ckpt.jsonl'
CSV = f'{BASE}/_cache/ats_ashby.csv'

existing = json.load(open(OUT))
have = {o['board'] for o in existing}
done = set()
if os.path.exists(CKPT):
    done = {json.loads(l)['board'] for l in open(CKPT) if l.strip()}
    print(f"resuming: {len(done)} already checked", flush=True)

cands = []
seen = set()
for r in csv.DictReader(open(CSV)):
    slug = (r.get('slug') or '').strip()
    name = (r.get('name') or '').strip()
    if slug and slug not in have and slug not in done and slug not in seen:
        seen.add(slug)
        cands.append((slug, name or slug))
print(f"{len(cands)} candidates to check", flush=True)

added = 0
ckpt = open(CKPT, 'a')
for i, (slug, name) in enumerate(cands):
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (research)"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode('utf-8', 'replace'))
        jobs = data.get('jobs')
        if isinstance(jobs, list) and jobs:
            existing.append({"company": name, "board": slug})
            added += 1
            have.add(slug)
    except Exception:
        pass
    ckpt.write(json.dumps({"board": slug, "ok": slug in have}) + "\n")
    if (i + 1) % 100 == 0:
        ckpt.flush()
        existing_sorted = sorted(existing, key=lambda o: o['company'].lower())
        json.dump(existing_sorted, open(OUT, 'w'), indent=2)
        print(f"...{i+1}/{len(cands)} added={added} total={len(existing)}", flush=True)
    time.sleep(0.25)

ckpt.close()
existing_sorted = sorted(existing, key=lambda o: o['company'].lower())
json.dump(existing_sorted, open(OUT, 'w'), indent=2)
print(f"DONE added={added} total={len(existing)}", flush=True)
