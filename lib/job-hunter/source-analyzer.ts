type AtsPlatform = 'workday' | 'greenhouse' | 'lever' | 'ashby'

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

    return null
  } catch {
    return null
  }
}
