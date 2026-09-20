"""ServiceNow keyword matching + US location filter. Ported from Harisflow's
lib/job-hunter/keywords.ts and us-location.ts — same rules, no API calls."""

STRONG_TITLE_TERMS = [
    'servicenow', 'service now', 'now platform', 'hrsd', 'itsm', 'itom', 'cmdb',
]

ROLE_TERMS = [
    'developer', 'architect', 'engineer', 'administrator', 'admin',
    'consultant', 'analyst',
]

ACTION_TERMS = [
    'implement', 'configure', 'develop', 'administer', 'maintain', 'integrate',
    'architect', 'design', 'support', 'build', 'customize', 'workflow',
    'catalog', 'platform',
]

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

import re

_US_ABBR = re.compile(
    r'\b[A-Za-z]+(?:[ .\'-][A-Za-z]+)*,\s*'
    r'(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|'
    r'nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy|dc)\b',
    re.IGNORECASE,
)

BLOCKED_LOCATIONS = [
    'india', 'uk', 'united kingdom', 'england', 'germany', 'france', 'spain',
    'netherlands', 'singapore', 'australia', 'philippines', 'mexico', 'brazil',
    'ireland', 'poland', 'romania', 'czech republic', 'hungary', 'israel',
    'pakistan', 'uae', 'united arab emirates', 'south africa', 'colombia',
    'argentina', 'portugal', 'italy', 'sweden', 'denmark', 'norway',
]

ALLOWED_LOCATIONS = [
    'united states', 'usa', 'u.s.', 'remote', 'canada', 'new york', 'michigan',
    'toronto', 'chicago', 'dallas', 'atlanta', 'washington', 'virginia',
]


def _has(text, term):
    return term.lower() in text.lower()


def title_might_match(title):
    """Cheap pre-filter on the title before we spend time on the description."""
    if not title:
        return True
    low = title.lower()
    if any(_has(low, t) for t in STRONG_TITLE_TERMS):
        return True
    return any(_has(low, t) for t in ROLE_TERMS)


def is_allowed_location(location, title=''):
    text = f'{location or ""} {title or ""}'.lower()
    if any(_has(text, b) for b in BLOCKED_LOCATIONS):
        return False
    if any(_has(text, a) for a in ALLOWED_LOCATIONS):
        return True
    if any(_has(text, s) for s in US_STATE_NAMES):
        return True
    return bool(_US_ABBR.search(text))


def description_matches(title, description):
    """Title has a ServiceNow term AND description shows real ServiceNow work."""
    text = f'{title or ""} {(description or "")[:1500]}'.lower()
    if not any(_has(text, t) for t in STRONG_TITLE_TERMS):
        return False
    actions = sum(1 for t in ACTION_TERMS if _has(text, t))
    return actions >= 2


def job_matches(job):
    """job = dict with title/description/location. Returns (bool, reason)."""
    title = job.get('title', '')
    if not title_might_match(title):
        return False, 'title'
    if not is_allowed_location(job.get('location'), title):
        return False, 'location'
    if not description_matches(title, job.get('description')):
        return False, 'keywords'
    return True, 'match'
