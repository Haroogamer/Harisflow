#!/usr/bin/env python3
"""Workday verification: checkpointed, browser UA, 0.5s sleep. Tries /en-US/ then bare site URL."""
import json, time, csv, os, re, urllib.request, urllib.error

BASE = os.path.expanduser('~/workspace/jobhunter/research')
OUT = f'{BASE}/companies_workday.json'
CKPT = f'{BASE}/_cache/workday_ckpt.jsonl'
CSV = f'{BASE}/_cache/ats_workday.csv'

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

BOOST = """accenture deloitte cognizant infosys wipro hcl dxc kyndryl ibm cisco dell nvidia
salesforce adobe workday intuit autodesk netapp snowflake databricks elastic mongodb splunk
servicenow jpmc bankofamerica wellsfargo uhg humana cvs pfizer merck lilly amgen gilead
abbvie regeneron bms vertex biogen moderna walmart target homedepot lowes costco nike
starbucks gm ford stellantis tesla toyota honda boeing ge honeywell caterpillar deere
eaton exxon chevron att verizon tmobile comcast united delta american southwest fedex ups
pepsico mondelez kraftheinz generalmills metlife prudential aig travelers liberty nationwide
progressive usaa allstate statefarm chubb marriott netflix disney warnerbros ea zoom dropbox
box atlassian palantir micron citi pnc usbank truist fifththird keybank regions citizens
huntington synchrony ally barclays hsbc td abbott medtronic baxter stryker thermo danaher
labcorp quest mckesson cencora kaiser hca tenet elevance centene kroger bestbuy walgreens
tjx mcdonalds yum darden hyatt paramount activision roblox vmware sap juniper paloalto
crowdstrike zscaler oracle microsoft ntt epam globant slalom perficient avanade insight
cdw rackspace cgi genpact exl virtusa ltimindtree mindtree persistent""".split()

def score(name):
    n = name.lower().replace(' ', '').replace(',', '').replace('.', '')
    s = sum(10 for b in BOOST if b in n)
    nl = name.lower()
    if any(k in nl for k in ['consult', 'technolog', 'systems', 'services', 'software', 'data', 'digital', 'health', 'bank', 'insurance', 'pharma']):
        s += 2
    return s

prio_kw = """accenture deloitte cognizant infosys wipro hcl dxc kyndryl ntt capgemini ey pwc kpmg tcs epam globant slalom perficient avanade insight cdw rackspace cgi atos virtusa mindtree ltimindtree persistent exl genpact wns ibm cisco dell hp nvidia salesforce adobe oracle microsoft servicenow workday intuit autodesk vmware sap netapp juniper paloalto crowdstrike zscaler snowflake databricks elastic mongodb splunk jpmc bankofamerica wellsfargo citi usbank pnc capitalone goldman morganstanley amex discover truist fifththird keybank regions citizens huntington comerica synchrony ally barclays hsbc bmo rbc td uhg humana cvs elevance centene cigna kaiser hca tenet mckesson cencora cardinal labcorp quest thermo danaher medtronic abbott baxter bd stryker boston zimmer edwards dexcom resmed illumina agilent iqvia pfizer merck lilly amgen gilead abbvie bms regeneron vertex biogen moderna walmart target homedepot lowes costco kroger bestbuy walgreens tjx nike starbucks mcdonalds yum ge honeywell caterpillar deere eaton emerson rockwell dupont dow ppg cummins paccar textron boeing exxon chevron conoco phillips66 valero marathon slb halliburton duke dominion exelon nextera southern xcel att verizon tmobile comcast charter united delta american southwest fedex ups gm ford stellantis tesla rivian toyota honda pepsico mondelez kraftheinz generalmills kellogg hershey tyson metlife prudential aig travelers liberty nationwide progressive usaa allstate statefarm hartford chubb aflac principal unum marriott hyatt netflix disney warnerbros paramount ea activision roblox zoom dropbox box atlassian palantir anduril lockheed raytheon northrop l3harris bae saic caci leidos boozallen mantech parsons kbr aecom jacobs fluor""".split()

done = {}
if os.path.exists(CKPT):
    for l in open(CKPT):
        if l.strip():
            d = json.loads(l)
            done[d['url']] = d
    print(f"resuming: {len(done)} already checked", flush=True)

seen = set(); cands = []
for r in csv.DictReader(open(CSV)):
    name = r['name'].lower().replace(' ', '').replace(',', '').replace('.', '').replace('&', '').replace("'", '')
    if any(p in name for p in prio_kw) and r['url'] not in seen and r['url'] not in done:
        seen.add(r['url'])
        cands.append(r)
cands.sort(key=lambda r: -score(r['name']))
cands = cands[:250]
print(f"{len(cands)} candidates to check (top 250 by relevance)", flush=True)

def check(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=12) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None

verified = []
ckpt = open(CKPT, 'a')
for i, r in enumerate(cands):
    base = r['url'].rstrip('/')
    m = re.match(r'(https://[^/]+)/(.*)', base)
    final, code = base, None
    if m:
        host, site = m.group(1), m.group(2)
        for u in (f"{host}/en-US/{site}", base):
            code = check(u)
            if code == 200:
                final = u
                break
    ok = (code == 200)
    if ok:
        verified.append({"company": r['name'], "board": final})
    ckpt.write(json.dumps({"url": r['url'], "ok": ok, "board": final if ok else None,
                           "company": r['name']}) + "\n")
    ckpt.flush()
    if (i + 1) % 50 == 0:
        print(f"...{i+1}/{len(cands)} verified={len(verified)}", flush=True)
    if (i + 1) % 10 == 0:
        print(f"  progress {(i+1)}/{len(cands)}", flush=True)
    time.sleep(0.5)
ckpt.close()

# include previously verified from checkpoint
for d in done.values():
    if d.get('ok'):
        verified.append({"company": d['company'], "board": d['board']})
dedup = {}
for v in verified:
    key = re.sub(r'\s*\(.*?\)\s*', '', v['company']).strip().lower()
    if key not in dedup:
        dedup[key] = v
out = sorted(dedup.values(), key=lambda o: o['company'].lower())
json.dump(out, open(OUT, 'w'), indent=2)
print(f"DONE verified={len(out)} unique companies", flush=True)
