import {
  hasUsStateIndicator,
} from '@/lib/job-hunter/us-location'

export const SERVICE_NOW_KEYWORDS = [
  'ServiceNow',
  'Service Now',
  'ITSM',
  'ITOM',
  'CMDB',
  'HRSD',
  'CSM',
  'GRC',
  'IntegrationHub',
  'Flow Designer',
  'Service Portal',
  'App Engine',
  'Now Platform',
]

const DIRECT_SERVICE_NOW_TERMS = [
  { label: 'servicenow', value: 'servicenow' },
  { label: 'service now', value: 'service now' },
]

const STRONG_TITLE_TERMS = [
  { label: 'ServiceNow', value: 'servicenow' },
  { label: 'Service Now', value: 'service now' },
  { label: 'Now Platform', value: 'now platform' },
  { label: 'HRSD', value: 'hrsd' },
  { label: 'ITSM', value: 'itsm' },
  { label: 'ITOM', value: 'itom' },
  { label: 'CMDB', value: 'cmdb' },
]

const ROLE_TERMS = [
  { label: 'Developer', value: 'developer' },
  { label: 'Architect', value: 'architect' },
  { label: 'Engineer', value: 'engineer' },
  { label: 'Administrator', value: 'administrator' },
  { label: 'Admin', value: 'admin' },
  { label: 'Consultant', value: 'consultant' },
  { label: 'Analyst', value: 'analyst' },
]

const ACTION_TERMS = [
  { label: 'implement', value: 'implement' },
  { label: 'configure', value: 'configure' },
  { label: 'develop', value: 'develop' },
  { label: 'administer', value: 'administer' },
  { label: 'maintain', value: 'maintain' },
  { label: 'integrate', value: 'integrate' },
  { label: 'architect', value: 'architect' },
  { label: 'design', value: 'design' },
  { label: 'support', value: 'support' },
  { label: 'build', value: 'build' },
  { label: 'customize', value: 'customize' },
  { label: 'workflow', value: 'workflow' },
  { label: 'catalog', value: 'catalog' },
  { label: 'platform', value: 'platform' },
  { label: 'module', value: 'module' },
  { label: 'instance', value: 'instance' },
  { label: 'automation', value: 'automation' },
  { label: 'integration', value: 'integration' },
]

const RESPONSIBILITY_SECTION_HEADINGS = [
  'what you will do',
  "what you'll do",
  'responsibilities',
  'key responsibilities',
  'duties',
  'your role',
  'about the role',
  'job description',
  'essential functions',
  'primary responsibilities',
]

const SECTION_STOP_HEADINGS = [
  ...RESPONSIBILITY_SECTION_HEADINGS,
  'requirements',
  'qualifications',
  'minimum qualifications',
  'preferred qualifications',
  'what you bring',
  'skills',
  'benefits',
  'about us',
  'compensation',
  'education',
  'experience',
]

const WEAK_CONTEXT_TERMS = [
  { label: 'preferred', value: 'preferred' },
  { label: 'nice to have', value: 'nice to have' },
  { label: 'bonus', value: 'bonus' },
  { label: 'tools', value: 'tools' },
  { label: 'exposure', value: 'exposure' },
  { label: 'familiarity', value: 'familiarity' },
  { label: 'experience with', value: 'experience with' },
  { label: 'plus', value: 'plus' },
]

const ALLOWED_LOCATION_TERMS = [
  { label: 'United States', value: 'united states' },
  { label: 'USA', value: 'usa' },
  { label: 'U.S.', value: 'u.s.' },
  { label: 'US', value: 'us' },
  { label: 'Canada', value: 'canada' },
  { label: 'Remote', value: 'remote' },
  { label: 'New York', value: 'new york' },
  { label: 'Michigan', value: 'michigan' },
  { label: 'Toronto', value: 'toronto' },
  { label: 'Chicago', value: 'chicago' },
  { label: 'Dallas', value: 'dallas' },
  { label: 'Atlanta', value: 'atlanta' },
  { label: 'Washington', value: 'washington' },
  { label: 'Virginia', value: 'virginia' },
]

const BLOCKED_LOCATION_TERMS = [
  { label: 'India', value: 'india' },
  { label: 'UK', value: 'uk' },
  { label: 'United Kingdom', value: 'united kingdom' },
  { label: 'Germany', value: 'germany' },
  { label: 'France', value: 'france' },
  { label: 'Spain', value: 'spain' },
  { label: 'Netherlands', value: 'netherlands' },
  { label: 'Singapore', value: 'singapore' },
  { label: 'Australia', value: 'australia' },
  { label: 'Philippines', value: 'philippines' },
  { label: 'Mexico', value: 'mexico' },
  { label: 'Brazil', value: 'brazil' },
]

function includesTerm(text: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const normalizedTerm = escapedTerm.replace(/\s+/g, '\\s+')
  const termPattern = new RegExp(`(^|[^a-z0-9])${normalizedTerm}($|[^a-z0-9])`)

  return termPattern.test(text)
}

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isResponsibilityHeading(line: string) {
  const normalizedLine = normalizeHeading(line)

  return RESPONSIBILITY_SECTION_HEADINGS.some(
    (heading) => normalizedLine === normalizeHeading(heading),
  )
}

function looksLikeSectionHeading(line: string) {
  const trimmedLine = line.trim()

  if (!trimmedLine || trimmedLine.length > 90) {
    return false
  }

  if (SECTION_STOP_HEADINGS.includes(normalizeHeading(trimmedLine))) {
    return true
  }

  return /^[A-Z][A-Za-z0-9 &'’/(),-]+:$/.test(trimmedLine)
}

export function extractResponsibilityText(jobDescription?: string | null) {
  if (!jobDescription) {
    return null
  }

  const lines = jobDescription
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())

  const headingIndex = lines.findIndex((line) => isResponsibilityHeading(line))

  if (headingIndex === -1) {
    return null
  }

  const sectionLines: string[] = []

  for (const line of lines.slice(headingIndex + 1)) {
    if (sectionLines.length > 0 && looksLikeSectionHeading(line)) {
      break
    }

    if (line) {
      sectionLines.push(line)
    }
  }

  return sectionLines.join(' ').trim() || null
}

export const REMOTE_LOCATIONS = [
  'Remote',
  'United States',
  'USA',
  'U.S.',
  'US',
  'Canada',
  'Atlanta, GA',
  'Chicago, IL',
  'Dallas, TX',
  'New York, NY',
  'Michigan',
  'Virginia',
  'Washington, DC',
  'Toronto',
]

type KeywordMatchJob = {
  title?: string | null
  description?: string | null
  job_description?: string | null
  location?: string | null
}

function getJobDescription(job: KeywordMatchJob) {
  return job.description ?? job.job_description ?? ''
}

function getResponsibilityText(job: KeywordMatchJob) {
  const description = getJobDescription(job)
  const extractedText = extractResponsibilityText(description)

  if (extractedText) {
    return extractedText
  }

  return `${job.title ?? ''} ${description.slice(0, 1500)}`.trim()
}

function getLocationText(job: KeywordMatchJob) {
  return [
    job.location,
    job.title,
    job.description ?? job.job_description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function isAllowedLocation(job: KeywordMatchJob) {
  const locationText = getLocationText(job)
  const hasBlockedLocation = BLOCKED_LOCATION_TERMS.some((term) =>
    includesTerm(locationText, term.value),
  )

  if (hasBlockedLocation) {
    return false
  }

  return (
    ALLOWED_LOCATION_TERMS.some((term) =>
      includesTerm(locationText, term.value),
    ) || hasUsStateIndicator(locationText, includesTerm)
  )
}

export function explainJobMatch(job: KeywordMatchJob) {
  const title = job.title?.toLowerCase() ?? ''
  const responsibilityTextUsed = getResponsibilityText(job)
  const responsibilityText = responsibilityTextUsed.toLowerCase()
  const locationAllowed = isAllowedLocation(job)
  const titleTerms = STRONG_TITLE_TERMS.filter((term) =>
    includesTerm(title, term.value),
  ).map((term) => term.label)
  const roleTerms = ROLE_TERMS.filter((term) =>
    includesTerm(title, term.value),
  ).map((term) => term.label)
  const titleMatchedTerms = [...titleTerms, ...roleTerms]
  const titleScore = 100
  const hasStrongTitleMatch = titleTerms.length > 0 && roleTerms.length > 0

  if (hasStrongTitleMatch && !locationAllowed) {
    return {
      matches: false,
      reason: 'Blocked by location filter',
      matchedTerms: titleMatchedTerms,
      score: titleScore,
      locationAllowed: false,
      responsibilityTextUsed,
    }
  }

  if (hasStrongTitleMatch) {
    return {
      matches: true,
      reason: 'Strong ServiceNow title match and allowed location',
      matchedTerms: titleMatchedTerms,
      score: titleScore,
      locationAllowed,
      responsibilityTextUsed,
    }
  }

  const directTerms = DIRECT_SERVICE_NOW_TERMS.filter((term) =>
    responsibilityText.includes(term.value),
  ).map((term) => term.label)
  const actionTerms = ACTION_TERMS.filter((term) =>
    includesTerm(responsibilityText, term.value),
  ).map((term) => term.label)
  const weakContextTerms = WEAK_CONTEXT_TERMS.filter((term) =>
    includesTerm(responsibilityText, term.value),
  ).map((term) => term.label)
  const responsibilityMatchedTerms = [...directTerms, ...actionTerms]
  const responsibilityScore = 80 + Math.min(actionTerms.length, 5)
  const hasResponsibilityMatch = directTerms.length > 0 && actionTerms.length >= 2

  if (hasResponsibilityMatch && !locationAllowed) {
    return {
      matches: false,
      reason: 'Blocked by location filter',
      matchedTerms: responsibilityMatchedTerms,
      score: responsibilityScore,
      locationAllowed: false,
      responsibilityTextUsed,
    }
  }

  if (hasResponsibilityMatch) {
    return {
      matches: true,
      reason: 'Responsibility text centers ServiceNow with multiple action terms and allowed location',
      matchedTerms: responsibilityMatchedTerms,
      score: responsibilityScore,
      locationAllowed,
      responsibilityTextUsed,
    }
  }

  let relevanceReason = 'No strong ServiceNow title or responsibility match'

  if (directTerms.length > 0 && actionTerms.length < 2) {
    relevanceReason =
      weakContextTerms.length > 0
        ? 'ServiceNow appears in weak context without enough action terms'
        : 'ServiceNow appears without enough responsibility action terms'
  } else if (titleTerms.length > 0 && roleTerms.length === 0) {
    relevanceReason = 'ServiceNow title term appears without a role word'
  } else if (roleTerms.length > 0 && titleTerms.length === 0) {
    relevanceReason = 'Role word appears without a strong ServiceNow title term'
  }

  return {
    matches: false,
    reason: locationAllowed
      ? relevanceReason
      : `${relevanceReason}; location is not US/Canada or remote eligible`,
    matchedTerms: [
      ...titleTerms,
      ...roleTerms,
      ...directTerms,
      ...actionTerms,
      ...weakContextTerms,
    ],
    score: 0,
    locationAllowed,
    responsibilityTextUsed,
  }
}

export function jobMatchesKeywords(job: KeywordMatchJob) {
  return explainJobMatch(job).matches
}
