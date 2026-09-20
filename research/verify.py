#!/usr/bin/env python3
"""Verify Greenhouse/Lever board identifiers against public APIs. Polite: sequential, 0.3s sleep."""
import json, time, sys
import urllib.request, urllib.error

UA = {"User-Agent": "Mozilla/5.0 (research; board-verification)"}

def get(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        try:
            body = e.read()
        except Exception:
            body = b""
        return e.code, body
    except Exception as e:
        return None, str(e).encode()

def main():
    cand_file = sys.argv[1] if len(sys.argv) > 1 else "/home/hatch/workspace/jobhunter/research/candidates.tsv"
    out_file = sys.argv[2] if len(sys.argv) > 2 else "/home/hatch/workspace/jobhunter/research/verified_raw.json"
    cands = []
    with open(cand_file) as f:
        for line in f:
            p, n, t = line.rstrip("\n").split("\t")
            cands.append((p, n, t))
    results = {"greenhouse": [], "lever": []}
    rate_limited = False
    for i, (plat, name, token) in enumerate(cands):
        if plat == "greenhouse":
            url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
        else:
            url = f"https://api.lever.co/v0/postings/{token}"
        status, body = get(url)
        if status == 429:
            print(f"[{i+1}/{len(cands)}] 429 on {token}; backing off 15s", flush=True)
            time.sleep(15)
            status, body = get(url)
            if status == 429:
                print("still 429; stopping further requests for this platform family", flush=True)
                rate_limited = True
                time.sleep(5)
                continue
        valid, jobs, disp = False, 0, name
        if status == 200:
            try:
                data = json.loads(body)
                if plat == "greenhouse" and isinstance(data, dict) and isinstance(data.get("jobs"), list):
                    valid, jobs = True, len(data["jobs"])
                    # official board name
                    s2, b2 = get(f"https://boards-api.greenhouse.io/v1/boards/{token}")
                    time.sleep(0.3)
                    if s2 == 200:
                        try:
                            disp = json.loads(b2).get("name") or name
                        except Exception:
                            pass
                elif plat == "lever" and isinstance(data, list):
                    valid, jobs = True, len(data)
            except Exception:
                pass
        mark = "OK " if valid else " -- "
        print(f"[{i+1}/{len(cands)}] {mark} {plat:10s} {token:28s} jobs={jobs}", flush=True)
        if valid:
            results[plat].append({"company": disp, "board": token, "jobs": jobs})
        time.sleep(0.3)
    with open(out_file, "w") as f:
        json.dump(results, f, indent=1)
    print(f"DONE gh={len(results['greenhouse'])} lever={len(results['lever'])} rate_limited={rate_limited}", flush=True)

main()
