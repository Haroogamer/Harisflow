type AtsPlatform =
  | 'workday'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'oraclecloud'
  | 'dayforce'
  | 'ultipro'

const DEFAULT_LOCALE = 'en'
const ORACLE_CLOUD_HOST_PATTERN =
  /^[a-z0-9-]+\.fa(?:\.[a-z0-9-]+)?\.oraclecloud\.com$/i
const DAYFORCE_HOST_PATTERN = /^(?:jobs|[a-z0-9-]+)\.dayforcehcm\.com$/i
const ULTIPRO_HOST_PATTERN = /^recruiting(?:2)?\.ultipro\.(?:com|ca)$/i

export type JobSourceCandidate = {
  company: string
  ats_platform: AtsPlatform
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
  return DAYFORCE_HOST_PATTERN.test(hostname)
}

function isUltiproHost(hostname: string) {
  return ULTIPRO_HOST_PATTERN.test(hostname)
}

export function normalizeJobSourceCareersUrl(value: string) {
  const url = new URL(value.trim())

  url.hostname = url.hostname.toLowerCase()
  url.search = ''
  url.hash = ''

  const pathParts = url.pathname.split('/').filter(Boolean)

  if (url.hostname.includes('myworkdayjobs.com')) {
    const jobIndex = pathParts.findIndex(
      (part) => part.toLowerCase() === 'job',
    )
    const normalizedParts =
      jobIndex === -1 ? pathParts : pathParts.slice(0, jobIndex)

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

export function analyzeJobSourceUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    if (hostname.includes('myworkdayjobs.com')) {
      return analyzeWorkdayUrl(parsedUrl)
    }

    if (hostname.includes('boards.greenhouse.io')) {
      return analyzeGreenhouseUrl(parsedUrl)
    }

    if (hostname.includes('jobs.lever.co')) {
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

    return null
  } catch {
    return null
  }
}
