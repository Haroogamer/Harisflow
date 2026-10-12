"""Job matcher — genuine ServiceNow relevance, fresh postings only.

Rules (user-defined, 2026-09-27; strict relevance since 2026-10-11 at user
request — the passing-mention tier kept surfacing noise like a front-end
role matched only on "ServiceNow" in the client's client list):
  1. RELEVANCE — two tracks, either one qualifies:
       a) SERVICENOW: a ServiceNow-family term ("servicenow",
          "service now", "now platform") in the TITLE, OR the description
          shows the job genuinely involves ServiceNow: an experience /
          skill / role phrase ("ServiceNow experience", "ServiceNow
          administrator"), a module name ("ServiceNow ITSM"), or a sentence
          where the role works with ServiceNow ("Our team uses ServiceNow
          for ticketing"). EXCLUDED: client-list name-drops ("we've
          partnered with companies like Google, ServiceNow, Uber"),
          competitor framing ("position against ServiceNow", "migrate from
          ServiceNow"), and list boilerplate ("platforms such as Salesforce
          or ServiceNow") — none of those is a ServiceNow job.
       b) FORWARD DEPLOYED: title contains "forward deployed" -> always
          relevant. Otherwise the description must name a forward-deployed
          role ("forward deployed engineer", "forward deployed architect",
          ...). A passing mention of a company's deployment model does NOT
          match.
     No company-type filter (startups and enterprises alike), no title or
     seniority restrictions beyond the relevance rule above.
  2. LOCATION — United States or Canada. Toronto/GTA is flagged (not filtered)
     so local hits stand out in alerts.
  3. GOVERNMENT — US federal / government / clearance roles are rejected.
     Canadian government and Canadian clearance (Reliability, etc.) pass.
  4. FRESHNESS — every match stays eligible for 30 days, so the standing
     stock of open roles surfaces — not just the newest flow. Unparseable
     dates pass (optimistic) — dropping a job over a date format would be
     worse than including it.
  5. TIER — 'core' = ServiceNow/FD term in the TITLE (alerts get a star);
     'desc' = genuine description-level relevance. Every alert is a real
     ServiceNow / Forward Deployed role now — there is no mention tier.

How to maintain: every rule lives in one of the CAPITALIZED lists below.
Regression tests in tests/test_match.py pin the behavior.

Pipeline (job_matches):
  relevance -> location -> government -> freshness
"""

# Bump this whenever the matching rules change. The Workday sweep caches
# "checked but not matched" URLs to avoid re-fetching descriptions every
# run; a version bump tells it to re-evaluate everything once.
# v6 (2026-10-11): the v5 sentence fallback was too loose — the first v5
# ATS run fired 50 alerts, most matching "nice-to-have familiarity with
# platforms such as Salesforce or ServiceNow" boilerplate. A description
# sentence now counts only when the role genuinely works with ServiceNow
# (work verbs: use, administer, develop, configure, ...), and competitor
# framing ("position against ServiceNow", "migrate from ServiceNow") plus
# list-membership ("platforms such as X or ServiceNow") are excluded.
MATCHER_VERSION = 6

import re
from datetime import date, datetime, timezone

# ---------------------------------------------------------------------------
# 1. Relevance: broad by user request (2026-09-30) — any ServiceNow mention
#    counts, no experience-depth requirement, no company-type filter.
#    Forward Deployed keeps its two-path shape (title auto-matches;
#    description must name a forward-deployed role). Word-boundary matched
#    so "now platform" can't match "know platform" / "snow platform".
# ---------------------------------------------------------------------------
RELEVANCE_TERMS = [
    r'\bservicenow\b',
    r'\bservice\s+now\b',      # "Service Now" with a space
    r'\bnow\s+platform\b',     # "Now Platform"
    r'\bnowplatform\b',
]

# Normalized (lowercased, "service now" -> "servicenow") experience phrases.
# If the description contains one of these, the job genuinely wants
# ServiceNow experience — not just a passing brand mention.
EXPERIENCE_PHRASES = [
    # role nouns: "ServiceNow X" as the job itself
    'servicenow developer', 'servicenow administrator', 'servicenow admin',
    'servicenow consultant', 'servicenow architect', 'servicenow engineer',
    'servicenow analyst', 'servicenow specialist', 'servicenow expert',
    'servicenow lead', 'servicenow manager', 'servicenow owner',
    'servicenow sme', 'servicenow professional',
    # experience / knowledge wordings
    'servicenow experience', 'experience with servicenow',
    'experience in servicenow', 'experience on servicenow',
    'experience using servicenow', 'servicenow background',
    'servicenow skills', 'servicenow skill', 'knowledge of servicenow',
    'servicenow knowledge', 'familiarity with servicenow',
    'familiar with servicenow', 'know servicenow', 'knows servicenow',
    'hands on servicenow', 'working knowledge of servicenow',
    'working with servicenow', 'work with servicenow',
    'works with servicenow', 'proficiency in servicenow',
    'proficient in servicenow', 'strong servicenow', 'solid servicenow',
    'deep servicenow', 'extensive servicenow',
    # requirement wordings
    'servicenow required', 'servicenow preferred', 'servicenow desired',
    # ServiceNow certification names (CSA/CAD/CIS)
    'servicenow certified', 'certified servicenow',
    'servicenow certification', 'certified system administrator',
    'certified application developer', 'certified implementation specialist',
    # platform
    'servicenow platform', 'nowplatform',
]

# ServiceNow module names following the brand: "ServiceNow ITSM", ...
MODULE_RES = [
    r'\bservicenow\s+(itsm|itom|itbm|hrsd|csm|fsm|grc|irm|secops|ppm|spm|cmdb|'
    r'discovery|devops|app\s+engine)\b',
]

# ---------------------------------------------------------------------------
# Forward Deployed (added 2026-09-30, user request): client-facing
# implementation roles — "Forward Deployed Engineer", "Forward Deployed AI
# Engineer", etc. Same two-path shape as ServiceNow: title mention
# auto-matches; description must name a forward-deployed ROLE, not just
# mention a company's deployment model in passing.
# _norm() turns "forward-deployed" into "forward deployed", so the phrase
# regexes below cover both spellings.
# ---------------------------------------------------------------------------
FORWARD_DEPLOYED_TITLE_RE = r'\bforward[\s-]?deployed\b'

FORWARD_DEPLOYED_PHRASES = [
    'forward deployed engineer', 'forward deployed software engineer',
    'forward deployed ai engineer', 'forward deployed architect',
    'forward deployed solutions architect',
    'forward deployed solutions engineer', 'forward deployed developer',
    'forward deployed consultant', 'forward deployed data scientist',
    'forward deployed specialist', 'forward deployed strategist',
    'forward deployed team',
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

US_MARKERS = [
    'united states', 'usa', r'u\.s\.', 'new york', 'michigan', 'chicago',
    'dallas', 'atlanta', 'washington', 'virginia',
]

CANADA_MARKERS = [
    'canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary',
    'edmonton', 'winnipeg', 'quebec', 'mississauga',
]

# Toronto + GTA municipalities — flagged in alerts, not filtered.
GTA_MARKERS = [
    'toronto', 'gta', 'greater toronto', 'mississauga', 'brampton',
    'scarborough', 'north york', 'etobicoke', 'vaughan', 'markham',
    'richmond hill', 'oakville', 'burlington', 'milton', 'ajax', 'pickering',
    'whitby', 'oshawa', 'newmarket', 'aurora', 'georgetown', 'halton',
    'peel region', 'york region', 'durham region',
]

# Client-list / partnership name-drop constructions. A sentence matching one
# of these is a brand mention, not a ServiceNow job ("we've partnered with
# companies like Google, ServiceNow, Uber"). Note "such as"/"including" are
# deliberately NOT excluded — "tools such as ServiceNow, Jira" is a genuine
# in-job mention. Bare partnership ("As a ServiceNow partner...") passes:
# it signals the work itself is ServiceNow.
_CLIENTLIST_MARKERS = [
    r'clients?\s+like', r'customers?\s+like', r'companies\s+like',
    r'trusted\s+by', r'client\s+(roster|list)', r'our\s+clients?\b',
]

# Sentence-level work cues (v6): the role must DO something with ServiceNow —
# use it, build on it, administer it. A bare name in a list ("platforms such
# as Salesforce or ServiceNow") is not a ServiceNow job.
_WORK_CUES = [
    'use', 'uses', 'using', 'utilize', 'utilizing',
    'work with', 'works with', 'working with',
    'administer', 'administers', 'administering', 'administration',
    'develop', 'develops', 'developing', 'development',
    'build', 'builds', 'building',
    'configure', 'configures', 'configuring', 'configuration',
    'implement', 'implements', 'implementing', 'implementation',
    'support', 'supports', 'supporting',
    'maintain', 'maintains', 'maintaining', 'maintenance',
    'manage', 'manages', 'managing',
    'operate', 'operates', 'operating',
    'deploy', 'deploys', 'deploying', 'deployment',
    'integrate', 'integrates', 'integrating', 'integration',
    'customize', 'customizes', 'customizing',
    'extend', 'extends', 'extending',
    'deliver', 'delivers', 'delivering', 'delivery',
    'must have', 'required', 'requires',
    'on the servicenow platform', 'within servicenow', 'across servicenow',
]

# Competitor framing: ServiceNow as the thing being beaten, replaced, or
# left ("position our suite against ServiceNow", "migrate from ServiceNow").
# A sales/competitor mention is not a ServiceNow job.
_COMPETITOR_RES = [
    r'\b(against|versus|vs\.?|unlike|alternative\s+to)\s+servicenow\b',
    r'\breplac\w*\s+servicenow\b',
    r'\bmigrate\w*\s+(from|off)\s+servicenow\b',
    r'\bdisplace\w*\s+servicenow\b',
    r'\bcompete\w*\s+(with|against)\s+servicenow\b',
]

# List-membership: ServiceNow as one example among others
# ("platforms such as Salesforce or ServiceNow") — not role relevance.
_LIST_RES = [
    r'\b(such\s+as|including|e\.g\.|for\s+example)\b.*\bservicenow\b',
    r'\blike\b.*\bservicenow\b',
]

# Disqualifies the location even when "remote" is present
# ("Remote AUS", "Remote EMEA", ...).
BLOCKED_LOCATIONS = [
    'india', 'uk', 'united kingdom', 'england', 'germany', 'france', 'spain',
    'netherlands', 'singapore', 'australia', 'philippines', 'mexico', 'brazil',
    'ireland', 'poland', 'romania', 'czech republic', 'hungary', 'israel',
    'pakistan', 'uae', 'united arab emirates', 'south africa', 'colombia',
    'argentina', 'portugal', 'italy', 'sweden', 'denmark', 'norway',
    'japan', 'tokyo', 'korea', 'seoul',
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
#    US-located jobs — Canadian government / clearance roles still pass.
# ---------------------------------------------------------------------------
GOVERNMENT_TERMS = [
    'federal', 'government', 'dod', 'department of defense',
]

CLEARANCE_TERMS = [
    'security clearance', 'secret clearance', 'top secret', 'public trust',
]

# ---------------------------------------------------------------------------
# 4. Freshness: max age in days — every match is a genuine ServiceNow /
#    Forward Deployed role now, so all stay eligible for 30 days and the
#    standing stock of open roles surfaces, not just the newest flow.
# ---------------------------------------------------------------------------
MAX_AGE_DAYS = 30


def _wordlist(terms):
    return re.compile('|'.join(rf'(?:{t})' for t in terms), re.IGNORECASE)


def _norm(text):
    """Lowercase + collapse variants so phrases match uniformly."""
    t = (text or '').lower().replace('-', ' ')
    t = re.sub(r'\bservice\s+now\b', 'servicenow', t)
    t = re.sub(r'\bnow\s+platform\b', 'nowplatform', t)
    return t


def _phrase_re(phrase):
    return r'\b' + r'\s+'.join(re.escape(w) for w in phrase.split()) + r'\b'


_RELEVANCE_RE = _wordlist(RELEVANCE_TERMS)
_EXPERIENCE_RE = re.compile('|'.join(_phrase_re(p) for p in EXPERIENCE_PHRASES))
_MODULE_RE = _wordlist(MODULE_RES)
_FD_TITLE_RE = re.compile(FORWARD_DEPLOYED_TITLE_RE, re.IGNORECASE)
_FD_PHRASE_RE = re.compile('|'.join(_phrase_re(p) for p in FORWARD_DEPLOYED_PHRASES))
_CITIZEN_RE = re.compile(r'\bcitizen\s+developer\b')
_LOWCODE_RE = re.compile(r'\b(low\s+code|no\s+code|nocode)\b')
_BLOCKED_RE = _wordlist([rf'\b{t}\b' for t in BLOCKED_LOCATIONS])
_US_MARKER_RE = _wordlist(US_MARKERS)
_CA_MARKER_RE = _wordlist([rf'\b{t}\b' for t in CANADA_MARKERS])
_GTA_RE = _wordlist([rf'\b{t}\b' for t in GTA_MARKERS])
_STATE_RE = _wordlist([rf'\b{s}\b' for s in US_STATE_NAMES])
_GOV_RE = _wordlist([rf'\b{t}\b' for t in GOVERNMENT_TERMS])
_CLEARANCE_RE = _wordlist(CLEARANCE_TERMS)
_CLIENTLIST_RE = _wordlist(_CLIENTLIST_MARKERS)
_WORKCUE_RE = re.compile('|'.join(_phrase_re(c) for c in _WORK_CUES))
_COMPETITOR_RE = _wordlist(_COMPETITOR_RES)
_LIST_RE = _wordlist(_LIST_RES)


# ---------------------------------------------------------------------------
# Relevance
# ---------------------------------------------------------------------------
def _genuine_sentence(sent):
    """A description sentence genuinely involves ServiceNow in the role.

    The role must DO something with ServiceNow (work cues: use, administer,
    develop, configure, ...). Excluded: client-list name-drops, competitor
    framing ("against ServiceNow", "migrate from ServiceNow"), and
    list-membership ("platforms such as Salesforce or ServiceNow").
    """
    if 'servicenow' not in sent and 'nowplatform' not in sent:
        return False
    if _CLIENTLIST_RE.search(sent):
        return False
    if _COMPETITOR_RE.search(sent):
        return False
    if _LIST_RE.search(sent):
        return False
    return _WORKCUE_RE.search(sent) is not None


def _has_genuine_sn_desc(description):
    """True when the description shows the job genuinely involves ServiceNow.

    Experience/skill/role phrases ("ServiceNow experience"), module names
    ("ServiceNow ITSM"), or a sentence where the role works with ServiceNow
    ("Our team uses ServiceNow for ticketing"). Client-list name-drops,
    competitor mentions, and "such as X or ServiceNow" list boilerplate are
    excluded — none of those is a ServiceNow job.
    """
    text = _norm(description or '')
    if not text:
        return False
    if _EXPERIENCE_RE.search(text) or _MODULE_RE.search(text):
        return True
    return any(_genuine_sentence(s) for s in re.split(r'[.!?\n]+', text))


def is_relevant(title, description):
    """True when the job is ServiceNow-related OR Forward Deployed.

    - ServiceNow: a ServiceNow-family term in the TITLE, or the description
      shows the job genuinely involves ServiceNow (see
      _has_genuine_sn_desc). Client-list name-drops do NOT match.
    - Forward Deployed: title contains "forward deployed" -> relevant,
      always. Otherwise the (normalized) description must name a
      forward-deployed role ("forward deployed engineer", ...). A lone
      passing mention ("our forward deployed model") is not relevant.
    """
    title = title or ''
    if _RELEVANCE_RE.search(title) or _FD_TITLE_RE.search(title):
        return True
    if _has_genuine_sn_desc(description):
        return True
    text = _norm(f'{title} {description or ""}')
    return _FD_PHRASE_RE.search(text) is not None


def title_might_match(title):
    """Cheap title pre-filter for the Workday crawler: is it worth spending
    a detail request on this title? Broad on purpose — any ServiceNow-family
    term or "forward deployed" qualifies. (Kept the old name so
    crawler/workday.py is unchanged.)"""
    title = title or ''
    return bool(_RELEVANCE_RE.search(title) or _FD_TITLE_RE.search(title))


def match_tier(job):
    """'core' for ServiceNow / Forward Deployed terms in the TITLE (alerts
    get a star), 'desc' for genuine description-level relevance
    (experience/module phrases, real in-job ServiceNow sentences, or a
    forward-deployed role phrase). There is no mention tier: every match is
    a real ServiceNow / Forward Deployed role since 2026-10-11.
    """
    title = job.get('title') or ''
    if _RELEVANCE_RE.search(title) or _FD_TITLE_RE.search(title):
        return 'core'
    return 'desc'


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------
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


def is_gta(location, title=''):
    """True if the job looks Toronto/GTA-based (flagged, not filtered)."""
    text = f'{location or ""} {title or ""}'.lower()
    return bool(_GTA_RE.search(text))


# ---------------------------------------------------------------------------
# Government / clearance (US only)
# ---------------------------------------------------------------------------
def is_government_job(job):
    """True for US federal/government/clearance roles."""
    company = job.get('company', '') or ''
    title = job.get('title', '') or ''
    who = f'{company} {title}'
    if _GOV_RE.search(who):
        return True
    return bool(_CLEARANCE_RE.search(job.get('description', '') or ''))


# ---------------------------------------------------------------------------
# Freshness
# ---------------------------------------------------------------------------
def parse_posted_date(value, today=None):
    """Normalize a posted-date value to a datetime.date, or None.

    Handles: None, epoch seconds/millis (int/float/str), ISO 8601,
    date-only strings, common human formats ("Sep 27, 2026"), and
    Workday-style relative dates ("Posted 4 Days Ago").
    """
    today = today or date.today()
    if value is None:
        return None
    if isinstance(value, (int, float)):
        ts = float(value)
        if ts > 1e12:      # epoch millis (Lever createdAt)
            ts /= 1000
        elif ts > 1e10:    # epoch micros — just in case
            ts /= 1e6
        try:
            return datetime.fromtimestamp(ts, tz=timezone.utc).date()
        except (OverflowError, OSError, ValueError):
            return None
    s = str(value).strip()
    if not s:
        return None
    # Workday-style relative dates: "Posted 4 Days Ago", "Posted Yesterday",
    # "Posted 30+ Days Ago", "Posted Today".
    low = s.lower()
    if 'posted' in low or 'yesterday' in low or re.search(r'\btoday\b', low):
        from datetime import timedelta as _td
        if re.search(r'\btoday\b', low):
            return today
        if 'yesterday' in low:
            return today - _td(days=1)
        m = re.search(r'(\d+)\+?\s*(day|week|month|hour|minute)', low)
        if m:
            n, unit = int(m.group(1)), m.group(2)
            days = n * {'day': 1, 'week': 7, 'month': 30,
                        'hour': 0, 'minute': 0}[unit]
            return today - _td(days=days)
    # Pure digits as string -> epoch
    if re.fullmatch(r'\d{10,16}', s):
        return parse_posted_date(int(s), today)
    # ISO 8601 / date-only
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).date()
    except ValueError:
        pass
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%b %d, %Y', '%B %d, %Y',
                '%Y/%m/%d', '%d-%b-%Y', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    # Last resort: find a YYYY-MM-DD inside a longer string
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    return None


def posted_age_days(job, today=None):
    """Days since posting, or None if the date can't be determined."""
    today = today or date.today()
    posted = parse_posted_date(job.get('date_posted'), today)
    if posted is None:
        return None
    return (today - posted).days


def is_fresh(job, today=None):
    """30-day freshness for every match — all of them are genuine
    ServiceNow / Forward Deployed roles now. Unknown dates pass
    (optimistic)."""
    age = posted_age_days(job, today)
    if age is None:
        return True
    return age <= MAX_AGE_DAYS


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------
def annotate_job(job, today=None):
    """Attach computed fields used by alerts: region, gta, age_days, tier."""
    job['region'] = location_region(job.get('location'), job.get('title'))
    job['gta'] = is_gta(job.get('location'), job.get('title'))
    job['age_days'] = posted_age_days(job, today)
    job['tier'] = match_tier(job)
    return job


def job_matches(job, today=None):
    """job = dict with company/title/description/location/date_posted.
    Returns (bool, reason). Reasons: 'relevance', 'location', 'government',
    'stale', 'match'."""
    if not is_relevant(job.get('title'), job.get('description')):
        return False, 'relevance'
    region = location_region(job.get('location'), job.get('title'))
    if not region:
        return False, 'location'
    if region != 'ca' and is_government_job(job):
        return False, 'government'
    if not is_fresh(job, today):
        return False, 'stale'
    return True, 'match'
