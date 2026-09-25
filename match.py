"""ServiceNow job matcher: US + Canada, no US government roles.

How to maintain this file: every rule lives in one of the CAPITALIZED lists
below. To allow/block a new location or employer type, edit the list —
no logic changes needed. Regression tests in test_match.py pin the behavior.

Matching pipeline (job_matches):
  1. title      - must look like a ServiceNow or tech role (cheap pre-filter)
  2. location   - must be United States or Canada (region-aware)
  3. government - US-located roles for government/federal/clearance employers
                  are rejected (Canadian government roles still pass)
  4. keywords   - must genuinely be about ServiceNow, not a passing mention
"""

import re

# ---------------------------------------------------------------------------
# 1. ServiceNow terms (word-boundary matched, so "now platform" can never
#    match "know platform" / "snow platform" inside a description).
# ---------------------------------------------------------------------------
STRONG_TERMS = [
    r'\bservicenow\b',
    r'\bservice\s+now\b',
    r'\bnow\s+platform\b',
    r'\bhrsd\b',
    r'\bitsm\b',
    r'\bitom\b',
    r'\bcmdb\b',
]

# Role words that only count when a STRONG_TERM is also present.
ROLE_TERMS = [
    'developer', 'architect', 'engineer', 'administrator', 'admin',
    'consultant', 'analyst', 'manager', 'lead',
]

# Description must show real ServiceNow work (>=2 of these).
ACTION_TERMS = [
    'implement', 'configure', 'develop', 'administer', 'maintain', 'integrate',
    'architect', 'design', 'support', 'build', 'customize', 'workflow',
    'catalog', 'platform',
]

# ---------------------------------------------------------------------------
# 2. Locations: United States + Canada. Everything else is out.
# ---------------------------------------------------------------------------
US_STATE_NAMES = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
    'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
    'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
    'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
    'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
    'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina',
    'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia',
    'washington', 'west virginia', 'wisconsin', 'wyoming',
    'district of columbia', 'washington dc',
]

# Explicitly-US markers (cities recruiters actually write).
US_MARKERS = [
    'united states', 'usa', r'u\.s\.', 'new york', 'michigan', 'chicago',
    'dallas', 'atlanta', 'washington', 'virginia',
]

# Canadian markers: whole country + major cities.
CANADA_MARKERS = [
    'canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary',
    'edmonton', 'winnipeg', 'quebec', 'mississauga',
]

# Any of these (word-boundary matched) disqualifies the location, even when
# the word "remote" is present ("Remote AUS", "Remote EMEA", ...).
BLOCKED_LOCATIONS = [
    'india', 'uk', 'united kingdom', 'england', 'germany', 'france', 'spain',
    'netherlands', 'singapore', 'australia', 'philippines', 'mexico', 'brazil',
    'ireland', 'poland', 'romania', 'czech republic', 'hungary', 'israel',
    'pakistan', 'uae', 'united arab emirates', 'south africa', 'colombia',
    'argentina', 'portugal', 'italy', 'sweden', 'denmark', 'norway',
    'europe', 'emea', 'apac', 'latam', 'anz', 'aus',
]

_US_ABBR = re.compile(
    r'\b[A-Za-z]+(?:[ .\'-][A-Za-z]+)*,\s*'
    r'(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|'
    r'nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy|dc)\b',
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# 3. US government exclusion. Checked against company + title always, and
#    against the description for clearance-specific phrases. Only applied to
#    US-located jobs (Canadian government roles still pass).
# ---------------------------------------------------------------------------
GOVERNMENT_TERMS = [
    'federal', 'government', 'dod', 'department of defense',
]

CLEARANCE_TERMS = [
    'security clearance', 'secret clearance', 'top secret', 'public trust',
]


def _wordlist(terms):
    return re.compile('|'.join(rf'(?:{t})' for t in terms), re.IGNORECASE)


_STRONG_RE = _wordlist(STRONG_TERMS)
_BLOCKED_RE = _wordlist([rf'\b{t}\b' for t in BLOCKED_LOCATIONS])
_US_MARKER_RE = _wordlist(US_MARKERS)
_CA_MARKER_RE = _wordlist([rf'\b{t}\b' for t in CANADA_MARKERS])
_STATE_RE = _wordlist([rf'\b{s}\b' for s in US_STATE_NAMES])
_GOV_RE = _wordlist([rf'\b{t}\b' for t in GOVERNMENT_TERMS])
_CLEARANCE_RE = _wordlist(CLEARANCE_TERMS)


def _has_strong_term(text):
    return bool(_STRONG_RE.search(text or ''))


def title_might_match(title):
    """Cheap pre-filter on the title before we spend time on the description."""
    if not title:
        return True
    low = title.lower()
    if _has_strong_term(title):
        return True
    return any(t in low for t in ROLE_TERMS)


def location_region(location, title=''):
    """'us', 'ca', or None. Bare 'remote' with no country attached -> 'us'."""
    text = f'{location or ""} {title or ""}'.lower()
    if _BLOCKED_RE.search(text):
        return None
    if _CA_MARKER_RE.search(text):
        return 'ca'
    if _US_MARKER_RE.search(text):
        return 'us'
    if _STATE_RE.search(text):
        return 'us'
    if _US_ABBR.search(text):
        return 'us'
    if re.search(r'\bremote\b', text):
        return 'us'
    return None


def is_government_job(job):
    """True for US federal/government/clearance roles."""
    company = job.get('company', '') or ''
    title = job.get('title', '') or ''
    who = f'{company} {title}'
    if _GOV_RE.search(who):
        return True
    return bool(_CLEARANCE_RE.search(job.get('description', '') or ''))


def description_matches(title, description):
    """Genuinely about ServiceNow: a strong term plus real ServiceNow work.

    The strong term must appear at least once across title + description.
    Tuned 2026-09-25: strong>=1 for volume, actions>=2 for quality (junk titles like 'Marketing Manager' filtered).
    """
    title = title or ''
    description = description or ''
    text = f'{title} {description[:1500]}'
    if len(_STRONG_RE.findall(text)) < 1:
        return False
    low = text.lower()
    actions = sum(1 for t in ACTION_TERMS if t in low)
    return actions >= 2


def job_matches(job):
    """job = dict with company/title/description/location.
    Returns (bool, reason)."""
    title = job.get('title', '')
    if not title_might_match(title):
        return False, 'title'
    region = location_region(job.get('location'), title)
    if not region:
        return False, 'location'
    if region != 'ca' and is_government_job(job):
        return False, 'government'
    if not description_matches(title, job.get('description')):
        return False, 'keywords'
    return True, 'match'
