"""Regression tests for the matcher: strict ServiceNow relevance, US+Canada,
30-day freshness for all matches.

Rules under test (2026-10-11, tightened at user request; v6 same day):
  - relevance: ServiceNow-family term in the TITLE, or the description
    genuinely involves ServiceNow (experience/skill/role phrases, module
    names, or a sentence where the role works with ServiceNow — work verbs
    like use/administer/develop/configure). EXCLUDED: client-list
    name-drops, competitor framing ("against ServiceNow", "migrate from
    ServiceNow"), and list boilerplate ("platforms such as Salesforce or
    ServiceNow"). Forward Deployed: title auto-match; description needs a
    role phrase.
  - tier: 'core' = SN/FD term in title (starred); 'desc' = genuine
    description-level relevance. No mention tier.
  - location: US or Canada only.
  - government: US federal/clearance rejected; Canadian passes.
  - freshness: 30 days for all matches; unknown dates pass (optimistic).
  - GTA locations are flagged, not filtered.

Run: python3 test_match.py
"""
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from match import (  # noqa: E402
    annotate_job,
    is_fresh,
    is_gta,
    is_relevant,
    job_matches,
    location_region,
    match_tier,
    parse_posted_date,
    posted_age_days,
    title_might_match,
)

TODAY = date(2026, 9, 27)
D = lambda n: (TODAY - timedelta(days=n)).isoformat()  # noqa: E731

SN_DESC = ("We are hiring a ServiceNow Developer to implement and configure "
           "workflows on the Now Platform. You will develop catalog items, "
           "integrate ServiceNow with third-party systems, and support ITSM.")

PASS = 0
FAIL = 0


def check(name, job, expected, expected_reason=None):
    global PASS, FAIL
    ok, reason = job_matches(job, today=TODAY)
    good = (ok == expected) and (expected_reason is None or reason == expected_reason)
    print(f'{"PASS" if good else "FAIL"} [{reason}] {name} '
          f'(expected {expected}, got {ok})')
    if good:
        PASS += 1
    else:
        FAIL += 1


def J(title, desc=SN_DESC, loc='Toronto, ON', company='Acme', posted=D(1)):
    return {'company': company, 'title': title, 'description': desc,
            'location': loc, 'date_posted': posted}


# --- relevance: strict — description must genuinely involve ServiceNow (2026-10-11) ---
check('title mention still auto-matches', J('ServiceNow Developer', desc='', loc='Remote, USA'), True)
check('title now platform', J('Now Platform Engineer'), True)
check('title service now w/ space', J('Service Now Administrator'), True)
check('sales title still matches (no title filter)', J('ServiceNow Sales Engineer'), True)
check('junior title (no seniority filter)', J('Junior ServiceNow Admin'), True)
check('desc experience phrase, generic title',
      J('Business Systems Analyst',
        desc='Requires 3+ years of ServiceNow experience supporting ITSM processes.'), True)
check('desc role noun, generic title',
      J('IT Analyst', desc='Act as ServiceNow administrator for incident and change.'), True)
check('desc cert name', J('Platform Analyst',
      desc='ServiceNow Certified System Administrator preferred.'), True)
check('desc module name', J('Support Specialist',
      desc='Provide L2 support for the ServiceNow ITSM module.'), True)
check('citizen developer + snow', J('Operations Analyst',
      desc='Citizen developer building workflow apps on ServiceNow.'), True)
check('low-code + snow', J('Process Analyst',
      desc='Low-code development experience with ServiceNow App Engine a plus.'), True)
check('now platform in desc', J('Consultant',
      desc='Deliver digital workflows on the Now Platform for clients.'), True)
check('genuine in-job sentence', J('IT Analyst',
      desc='Our team uses ServiceNow for ticketing and change management.'), True)
check('work-verb sentence', J('Engineer',
      desc='You will develop and maintain ServiceNow workflows and integrations.'), True)
check('must-have sentence', J('Administrator',
      desc='Must have ServiceNow administration skills.'), True)
check('nice-to-have platform list rejected (Appian case)', J('Graphic Designer',
      desc='We value experience with enterprise platforms such as Salesforce or ServiceNow.'), False, 'relevance')
check('such-as list rejected', J('HR Generalist',
      desc='Familiarity with HR systems such as Workday and ServiceNow.'), False, 'relevance')
check('competitor against rejected', J('Renewal Account Manager',
      desc='Position our BPM suite against ServiceNow and Pega.'), False, 'relevance')
check('migrate-from rejected', J('Solutions Consultant',
      desc='Help customers migrate from ServiceNow to our platform.'), False, 'relevance')
check('client-list name-drop rejected (Instrument case)', J('Senior Developer',
      desc='For over 20 years, we have partnered with companies like Google, ServiceNow, Uber, and Eventbrite, helping them launch new ideas.'), False, 'relevance')
check('clients-like sentence rejected', J('Designer',
      desc='Our clients like Nike, ServiceNow, and Airbnb trust us with brand work.'), False, 'relevance')
check('trusted-by sentence rejected', J('Engineer',
      desc='Trusted by ServiceNow, Google, and Uber for digital experiences.'), False, 'relevance')
check('no mention anywhere', J('Jira Administrator', desc='Atlassian stack admin.'), False, 'relevance')
check('snow platform false positive guard', J('Snow Platform Skier', desc='ski resort ops'), False, 'relevance')

# --- relevance: Forward Deployed (added 2026-09-30) ---
check('fd title auto-matches', J('Forward Deployed Engineer', desc=''), True)
check('fd title ai engineer', J('Forward Deployed AI Engineer', desc=''), True)
check('fd title hyphenated', J('Forward-Deployed Solutions Architect', desc=''), True)
check('fd title junior (no seniority filter)', J('Junior Forward Deployed Engineer', desc=''), True)
check('fd desc role phrase, generic title',
      J('Solutions Architect',
        desc='We are hiring a forward deployed engineer to embed with enterprise clients.'), True)
check('fd desc role noun', J('AI Consultant',
      desc='Work as a forward deployed architect on customer AI rollouts.'), True)
check('fd passing mention rejected', J('Account Executive',
      desc='Our company uses a forward deployed model for implementations.'), False, 'relevance')
check('fd unrelated "deployed"', J('DevOps Engineer',
      desc='We deployed the new forward proxy yesterday.'), False, 'relevance')
check('fd + location gate still applies',
      J('Forward Deployed Engineer', desc='', loc='London, UK'), False, 'location')
check('fd + freshness gate still applies (31d stale)',
      J('Forward Deployed Engineer', desc='', posted=D(31)), False, 'stale')
check('fd fresh at 10d',
      J('Forward Deployed Engineer', desc='', posted=D(10)), True)
check('fd + gov gate still applies',
      J('Forward Deployed Engineer', desc='', company='US Federal Services', loc='Washington, DC'), False, 'government')

# --- location ---
check('us city', J('ServiceNow Developer', loc='Chicago, IL'), True)
check('us remote', J('ServiceNow Developer', loc='Remote - United States'), True)
check('canada', J('ServiceNow Developer', loc='Vancouver, BC'), True)
check('india rejected', J('ServiceNow Developer', loc='Bangalore, India'), False, 'location')
check('remote emea rejected', J('ServiceNow Developer', loc='Remote EMEA'), False, 'location')

# --- government ---
check('us federal rejected',
      J('ServiceNow Developer', loc='Washington, DC', company='Department of Defense'), False, 'government')
check('us clearance rejected',
      J('ServiceNow Developer', loc='Reston, VA',
        desc='ServiceNow role. Requires active Top Secret clearance.'), False, 'government')
check('canadian gov passes',
      J('ServiceNow Developer', loc='Ottawa, ON', company='Government of Canada'), True)
check('canadian clearance passes',
      J('ServiceNow Developer', loc='Ottawa, ON',
        desc='ServiceNow dev. Reliability clearance required.'), True)

# --- freshness (flat 30 days for all matches since 2026-10-11) ---
check('posted today', J('ServiceNow Developer', posted=D(0)), True)
check('posted 3 days ago', J('ServiceNow Developer', posted=D(3)), True)
check('posted 10 days ago still fresh', J('ServiceNow Developer', posted=D(10)), True)
check('posted 30 days ago still fresh', J('ServiceNow Developer', posted=D(30)), True)
check('posted 31 days ago stale', J('ServiceNow Developer', posted=D(31)), False, 'stale')
check('desc-tier: posted 10 days ago fresh',
      J('IT Analyst', desc='Our team uses ServiceNow for ticketing.', posted=D(10)), True)
check('desc-tier: posted 31 days ago stale',
      J('IT Analyst', desc='Our team uses ServiceNow for ticketing.', posted=D(31)), False, 'stale')
check('unknown date passes (optimistic)', J('ServiceNow Developer', posted=None), True)
check('epoch millis fresh', J('ServiceNow Developer',
      posted=int((TODAY - timedelta(days=1)).strftime('%s')) * 1000), True)

# --- unit: date parsing ---
assert parse_posted_date(None) is None
assert parse_posted_date('2026-09-27', TODAY) == TODAY
assert parse_posted_date('2026-09-27T14:30:00Z', TODAY) == TODAY
assert parse_posted_date('Sep 27, 2026', TODAY) == TODAY
assert parse_posted_date('Posted 4 Days Ago', TODAY) == TODAY - timedelta(days=4)
assert parse_posted_date('Posted Yesterday', TODAY) == TODAY - timedelta(days=1)
assert parse_posted_date('Posted Today', TODAY) == TODAY
assert parse_posted_date('Posted 30+ Days Ago', TODAY) == TODAY - timedelta(days=30)
assert parse_posted_date('garbage', TODAY) is None
assert posted_age_days({'date_posted': D(2)}, today=TODAY) == 2
assert posted_age_days({'date_posted': None}, today=TODAY) is None
assert is_fresh({'date_posted': D(3)}, today=TODAY)
assert is_fresh({'date_posted': D(4)}, today=TODAY)
assert not is_fresh({'date_posted': D(31)}, today=TODAY)
assert is_fresh({'date_posted': None}, today=TODAY)
print('PASS [unit] date parsing + freshness')

# --- unit: tier ---
assert match_tier({'title': 'ServiceNow Developer', 'description': ''}) == 'core'
assert match_tier({'title': 'Senior Software Engineer - ITSM Service Now Team', 'description': ''}) == 'core'
assert match_tier({'title': 'Forward Deployed Engineer', 'description': ''}) == 'core'
assert match_tier({'title': 'HR Generalist', 'description': 'Must have ServiceNow experience.'}) == 'desc'
assert match_tier({'title': 'Analyst', 'description': 'Administer ServiceNow ITSM modules.'}) == 'desc'
assert match_tier({'title': 'Engineer', 'description': 'Join us as a forward deployed engineer.'}) == 'desc'
assert match_tier({'title': 'HR Generalist', 'description': 'We use ServiceNow for ticketing.'}) == 'desc'
assert match_tier({'title': 'IT Analyst', 'description': 'Our team uses ServiceNow for ticketing.'}) == 'desc'
print('PASS [unit] tier')
assert is_fresh({'title': 'ServiceNow Developer', 'description': '', 'date_posted': D(10)}, today=TODAY)
assert not is_fresh({'title': 'ServiceNow Developer', 'description': '', 'date_posted': D(31)}, today=TODAY)
assert is_fresh({'title': 'IT Analyst', 'description': 'Our team uses ServiceNow for ticketing.',
                 'date_posted': D(10)}, today=TODAY)
assert not is_fresh({'title': 'IT Analyst', 'description': 'Our team uses ServiceNow for ticketing.',
                     'date_posted': D(31)}, today=TODAY)
print('PASS [unit] 30-day freshness')

# --- unit: gta + region + title prefilter ---
assert is_gta('Toronto, ON') and is_gta('Mississauga, ON') and is_gta('Remote - GTA')
assert not is_gta('Chicago, IL')
assert location_region('Toronto, ON') == 'ca'
assert location_region('Austin, TX') == 'us'
assert title_might_match('ServiceNow Architect')
assert not title_might_match('Barista')
print('PASS [unit] gta + region + title prefilter')

# --- unit: annotate_job ---
job = annotate_job(J('ServiceNow Developer', loc='Toronto, ON', posted=D(1)), today=TODAY)
assert job['region'] == 'ca' and job['gta'] is True and job['age_days'] == 1
assert job['tier'] == 'core'
job2 = annotate_job(J('IT Analyst', desc='Our team uses ServiceNow for ticketing.', loc='Austin, TX', posted=D(1)), today=TODAY)
assert job2['tier'] == 'desc'
print('PASS [unit] annotate_job')

print(f'\n{PASS} passed, {FAIL} failed')
sys.exit(1 if FAIL else 0)
