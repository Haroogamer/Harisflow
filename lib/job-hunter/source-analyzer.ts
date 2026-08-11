import type { SupportedAtsPlatform } from '@/lib/job-hunter/crawlers/registry'

const DEFAULT_LOCALE = 'en'
const ORACLE_CLOUD_HOST_PATTERN =
  /^[a-z0-9-]+\.fa(?:\.[a-z0-9-]+)?\.oraclecloud\.com$/i
const DAYFORCE_HOSTNAME = 'jobs.dayforcehcm.com'
const ULTIPRO_HOST_PATTERN = /^recruiting(?:2)?\.ultipro\.(?:com|ca)$/i
const SMARTRECRUITERS_HOSTNAME = 'careers.smartrecruiters.com'
const ICIMS_HOST_PATTERN = /^[a-z0-9-]+\.icims\.com$/i

export type JobSourceCandidate = {
  company: string
  ats_platform: SupportedAtsPlatform
  careers_url: string
  original_url: string
  confidence: number
  notes: string
}

function prettifyCompany(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isOracleCloudHost(hostname: string) {
  return ORACLE_CLOUD_HOST_PATTERN.test(hostname)
}

function isDayforceHost(hostname: string) {
  return hostname === DAYFORCE_HOSTNAME
}

function isUltiproHost(hostname: string) {
  return ULTIPRO_HOST_PATTERN.test(hostname)
}

function isSmartRecruitersHost(hostname: string) {
  return hostname === SMARTRECRUITERS_HOSTNAME
}

function isIcimsHost(hostname: string) {
  return ICIMS_HOST_PATTERN.test(hostname)
}

export function normalizeJobSourceCareersUrl(value: string) {
  const url = new URL(value.trim())

  url.hostname = url.hostname.toLowerCase()
  url.search = ''
  url.hash = ''

  const pathParts = url.pathname.split('/').filter(Boolean)

  if (url.hostname.includes('myworkdayjobs.com')) {
    const localePattern = /^[a-z]{2}(?:-[a-z]{2})?$/i
    const firstPartLooksLikeLocale = localePattern.test(pathParts[0] ?? '')
    const markerIndex = pathParts.findIndex((part) => {
      const lowered = part.toLowerCase()
      return lowered === 'job' || lowered === 'details'
    })
    let normalizedParts = pathParts

    if (markerIndex > 0) {
      normalizedParts = pathParts.slice(0, markerIndex)
    } else if (
      firstPartLooksLikeLocale &&
      pathParts.length >= 2 &&
      !['job', 'details'].includes((pathParts[1] ?? '').toLowerCase())
    ) {
      normalizedParts = pathParts.slice(0, 2)
    } else if (pathParts.length > 0) {
      normalizedParts = pathParts.slice(0, 1)
    }

    url.pathname = normalizedParts.length > 0
      ? `/${normalizedParts.join('/')}`
      : ''
  }

  if (isOracleCloudHost(url.hostname)) {
    const pathParts = url.pathname.split('/').filter(Boolean)
    const candidateExperienceIndex = pathParts.findIndex(
      (part) => part === 'CandidateExperience',
    )
    const sitesIndex = pathParts.findIndex((part) => part === 'sites')
    const locale = pathParts[candidateExperienceIndex + 1] ?? DEFAULT_LOCALE
    const siteNumber = sitesIndex === -1 ? '' : pathParts[sitesIndex + 1] ?? ''

    if (candidateExperienceIndex !== -1 && siteNumber) {
      url.pathname = `/hcmUI/CandidateExperience/${locale}/sites/${siteNumber}/jobs`
    }
  }

  if (isDayforceHost(url.hostname)) {
    const pathParts = url.pathname.split('/').filter(Boolean)

    if (pathParts.length >= 3) {
      url.pathname = `/${pathParts.slice(0, 3).join('/')}`
    }
  }

  if (isUltiproHost(url.hostname)) {
    const pathParts = url.pathname.split('/').filter(Boolean)
    const jobBoardIndex = pathParts.findIndex(
      (part) => part.toLowerCase() === 'jobboard',
    )
    const companyCode = pathParts[0] ?? ''
    const boardId = jobBoardIndex === -1 ? '' : pathParts[jobBoardIndex + 1] ?? ''

    if (companyCode && boardId) {
      url.pathname = `/${companyCode}/JobBoard/${boardId}`
    }
  }

  if (isSmartRecruitersHost(url.hostname)) {
    const pathParts = url.pathname.split('/').filter(Boolean)
    // Normalize to /{companyId} — strip any job-level path segments
    const companyId = pathParts[0] ?? ''

    url.pathname = companyId ? `/${companyId}` : ''
  }

  if (isIcimsHost(url.hostname)) {
    // Normalize to /jobs/search — strip individual job ID segments
    url.pathname = '/jobs/search'
  }

  url.pathname = url.pathname.replace(/\/+$/, '')

  return url.toString().replace(/\/$/, '')
}

function analyzeWorkdayUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const tenant = url.hostname.split('.wd')[0]
  const site = pathParts[0] ?? ''
  const company = prettifyCompany(tenant)
  const careersUrl = normalizeJobSourceCareersUrl(url.toString())
  const isPostingUrl = pathParts.length > 1

  return {
    company,
    ats_platform: 'workday',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: site ? 0.95 : 0.75,
    notes: isPostingUrl
      ? 'Detected Workday job URL and normalized to the Workday careers site.'
      : 'Detected Workday careers site.',
  }
}

function analyzeGreenhouseUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const boardToken = pathParts[0] ?? ''
  const company = prettifyCompany(boardToken)
  const careersUrl = `${url.origin}/${boardToken}`
  const isPostingUrl = pathParts.length > 1

  return {
    company,
    ats_platform: 'greenhouse',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: boardToken ? 0.95 : 0.7,
    notes: isPostingUrl
      ? 'Detected Greenhouse job URL and normalized to the Greenhouse board.'
      : 'Detected Greenhouse board URL.',
  }
}

function analyzeLeverUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const companySlug = pathParts[0] ?? ''
  const company = prettifyCompany(companySlug)
  const careersUrl = `${url.origin}/${companySlug}`
  const isPostingUrl = pathParts.length > 1

  return {
    company,
    ats_platform: 'lever',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: companySlug ? 0.95 : 0.7,
    notes: isPostingUrl
      ? 'Detected Lever job URL and normalized to the Lever company board.'
      : 'Detected Lever company board URL.',
  }
}

function analyzeAshbyUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const boardHandle = pathParts[0] ?? ''
  const company = prettifyCompany(boardHandle)
  const careersUrl = `${url.origin}/${boardHandle}`
  const isPostingUrl = pathParts.length > 1

  return {
    company,
    ats_platform: 'ashby',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: boardHandle ? 0.95 : 0.7,
    notes: isPostingUrl
      ? 'Detected Ashby job URL and normalized to the Ashby board.'
      : 'Detected Ashby board URL.',
  }
}

function analyzeOracleCloudUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const sitesIndex = pathParts.findIndex((part) => part === 'sites')
  const siteNumber = sitesIndex === -1 ? '' : pathParts[sitesIndex + 1] ?? ''
  const company = prettifyCompany(url.hostname.split('.fa')[0] ?? '')
  const careersUrl = normalizeJobSourceCareersUrl(url.toString())

  return {
    company,
    ats_platform: 'oraclecloud',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: siteNumber ? 0.95 : 0.7,
    notes: siteNumber
      ? 'Detected Oracle Cloud Candidate Experience site and normalized to the jobs listing.'
      : 'Detected Oracle Cloud careers URL.',
  }
}

function analyzeDayforceUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const companySlug = pathParts[1] ?? url.hostname.split('.')[0] ?? ''
  const boardCode = pathParts[2] ?? ''
  const careersUrl = normalizeJobSourceCareersUrl(url.toString())

  return {
    company: prettifyCompany(companySlug),
    ats_platform: 'dayforce',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: companySlug && boardCode ? 0.95 : 0.7,
    notes: boardCode
      ? 'Detected Dayforce careers site and normalized to the board listing.'
      : 'Detected Dayforce careers URL.',
  }
}

function analyzeUltiproUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const companyCode = pathParts[0] ?? ''
  const jobBoardIndex = pathParts.findIndex(
    (part) => part.toLowerCase() === 'jobboard',
  )
  const boardId = jobBoardIndex === -1 ? '' : pathParts[jobBoardIndex + 1] ?? ''
  const careersUrl = normalizeJobSourceCareersUrl(url.toString())

  return {
    company: prettifyCompany(companyCode),
    ats_platform: 'ultipro',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: companyCode && boardId ? 0.95 : 0.7,
    notes: boardId
      ? 'Detected UltiPro job board and normalized to the board root.'
      : 'Detected UltiPro careers URL.',
  }
}

function analyzeSmartRecruitersUrl(url: URL): JobSourceCandidate {
  const pathParts = url.pathname.split('/').filter(Boolean)
  const companyId = pathParts[0] ?? ''
  const company = prettifyCompany(companyId)
  const careersUrl = normalizeJobSourceCareersUrl(url.toString())
  const isPostingUrl = pathParts.length > 1

  return {
    company,
    ats_platform: 'smartrecruiters',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: companyId ? 0.95 : 0.7,
    notes: isPostingUrl
      ? 'Detected SmartRecruiters job URL and normalized to the careers board.'
      : 'Detected SmartRecruiters careers board URL.',
  }
}

function analyzeIcimsUrl(url: URL): JobSourceCandidate {
  const hostname = url.hostname.toLowerCase()
  // Extract company name from subdomain: {company}.icims.com
  const companySlug = hostname.replace(/\.icims\.com$/, '')
  const company = prettifyCompany(companySlug)
  const careersUrl = normalizeJobSourceCareersUrl(url.toString())

  return {
    company,
    ats_platform: 'icims',
    careers_url: careersUrl,
    original_url: url.toString(),
    confidence: companySlug ? 0.9 : 0.7,
    notes: 'Detected iCIMS job portal and normalized to the job search listing.',
  }
}

export function analyzeJobSourceUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    if (hostname.includes('myworkdayjobs.com')) {
      return analyzeWorkdayUrl(parsedUrl)
    }

    if (
      hostname === 'boards.greenhouse.io' ||
      hostname === 'job-boards.greenhouse.io'
    ) {
      return analyzeGreenhouseUrl(parsedUrl)
    }

    if (hostname === 'jobs.lever.co') {
      return analyzeLeverUrl(parsedUrl)
    }

    // Use endsWith to prevent substring-match bypass (e.g. evilashbyhq.com)
    if (hostname === 'jobs.ashbyhq.com' || hostname.endsWith('.ashbyhq.com')) {
      return analyzeAshbyUrl(parsedUrl)
    }

    if (isOracleCloudHost(hostname)) {
      return analyzeOracleCloudUrl(parsedUrl)
    }

    if (isDayforceHost(hostname)) {
      return analyzeDayforceUrl(parsedUrl)
    }

    if (isUltiproHost(hostname)) {
      return analyzeUltiproUrl(parsedUrl)
    }

    if (isSmartRecruitersHost(hostname)) {
      return analyzeSmartRecruitersUrl(parsedUrl)
    }

    if (isIcimsHost(hostname)) {
      return analyzeIcimsUrl(parsedUrl)
    }

    return null
  } catch {
    return null
  }
}
