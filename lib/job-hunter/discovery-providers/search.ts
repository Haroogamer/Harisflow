import {
  hasBlockedInternationalLocation,
  hasNorthAmericaLocationIndicator,
} from '@/lib/job-hunter/us-location'

const SERPAPI_SEARCH_URL = 'https://serpapi.com/search.json'
const MAX_DISCOVERED_URLS = 75
const MAX_GOOGLE_JOBS = 50
const LOCATION_QUALIFIER = '("United States" OR USA OR Canada OR Remote)'
const ATS_SITE_SCOPES = [
  'site:myworkdayjobs.com',
  'site:boards.greenhouse.io',
  'site:jobs.lever.co',
  'site:jobs.ashbyhq.com',
  'site:oraclecloud.com/hcmUI/CandidateExperience',
  'site:jobs.dayforcehcm.com',
  'site:recruiting.ultipro.com',
  'site:recruiting.ultipro.ca',
  'site:recruiting2.ultipro.com',
  'site:recruiting2.ultipro.ca',
  'site:careers.smartrecruiters.com',
  'site:icims.com',
] as const
const SERVICE_NOW_SEARCH_TERMS = [
  'ServiceNow Developer',
  'ServiceNow Architect',
  'ServiceNow Engineer',
  'ServiceNow Administrator',
  'ServiceNow Admin',
  'ServiceNow Consultant',
  'ServiceNow Business Analyst',
  'ServiceNow Platform Engineer',
  'ServiceNow ITSM',
  'ServiceNow ITOM',
  'ServiceNow HRSD',
] as const

export const SEARCH_DISCOVERY_QUERIES = ATS_SITE_SCOPES.flatMap((siteScope) =>
  SERVICE_NOW_SEARCH_TERMS.map(
    (term) => `${siteScope} ${term} ${LOCATION_QUALIFIER}`,
  ),
)

const GOOGLE_JOBS_QUERIES = SERVICE_NOW_SEARCH_TERMS

type SerpApiOrganicResult = {
  title?: string
  link?: string
  displayed_link?: string
  snippet?: string
}

type SerpApiSearchResponse = {
  organic_results?: SerpApiOrganicResult[]
  error?: string
}

type SerpApiGoogleJobsApplyOption = {
  title?: string
  link?: string
}

type SerpApiGoogleJobsResult = {
  title?: string
  company_name?: string
  location?: string
  detected_extensions?: {
    posted_at?: string
    work_from_home?: boolean
  }
  apply_options?: SerpApiGoogleJobsApplyOption[]
}

type SerpApiGoogleJobsResponse = {
  jobs_results?: SerpApiGoogleJobsResult[]
  error?: string
}

export type GoogleJobsDiscoveredJob = {
  title: string
  company: string
  location: string
  workFromHome: boolean
  postedAt: string | null
  applyOptions: {
    title: string
    link: string
  }[]
}

function includesLocationTerm(text: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const normalizedTerm = escapedTerm.replace(/\s+/g, '\\s+')
  const termPattern = new RegExp(`(^|[^a-z0-9])${normalizedTerm}($|[^a-z0-9])`)

  return termPattern.test(text)
}

function resultMatchesAllowedLocation(result: SerpApiOrganicResult) {
  const searchableText = [
    result.title,
    result.snippet,
    result.displayed_link,
    result.link,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const hasBlockedLocation = hasBlockedInternationalLocation(
    searchableText,
    includesLocationTerm,
  )

  if (hasBlockedLocation) {
    return false
  }

  return hasNorthAmericaLocationIndicator(searchableText, includesLocationTerm)
}

async function searchSerpApi(query: string, apiKey: string) {
  const searchParams = new URLSearchParams({
    engine: 'google',
    q: query,
    location: 'United States',
    google_domain: 'google.com',
    gl: 'us',
    hl: 'en',
    api_key: apiKey,
  })
  const response = await fetch(`${SERPAPI_SEARCH_URL}?${searchParams}`)

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(`SerpAPI failed with status ${response.status}: ${errorBody}`)
  }

  const data = (await response.json()) as SerpApiSearchResponse

  if (data.error) {
    throw new Error(`SerpAPI returned an error: ${data.error}`)
  }

  return data.organic_results ?? []
}

export async function searchServiceNowJobUrls() {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    console.warn(
      'SERPAPI_API_KEY is missing; internet job discovery will return no URLs.',
    )

    return []
  }

  const urls = new Set<string>()

  for (const query of SEARCH_DISCOVERY_QUERIES) {
    try {
      const organicResults = await searchSerpApi(query, apiKey)

      for (const result of organicResults) {
        if (result.link && resultMatchesAllowedLocation(result)) {
          urls.add(result.link)
        }

        if (urls.size >= MAX_DISCOVERED_URLS) {
          return Array.from(urls)
        }
      }
    } catch (error) {
      console.warn(`SerpAPI discovery query failed: ${query}`)
      console.warn(error)
    }
  }

  return Array.from(urls)
}

async function searchGoogleJobsApi(
  query: string,
  apiKey: string,
): Promise<SerpApiGoogleJobsResult[]> {
  const searchParams = new URLSearchParams({
    engine: 'google_jobs',
    q: query,
    location: 'United States',
    gl: 'us',
    hl: 'en',
    api_key: apiKey,
  })
  const response = await fetch(`${SERPAPI_SEARCH_URL}?${searchParams}`)

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `SerpAPI Google Jobs failed with status ${response.status}: ${errorBody}`,
    )
  }

  const data = (await response.json()) as SerpApiGoogleJobsResponse

  if (data.error) {
    throw new Error(`SerpAPI Google Jobs returned an error: ${data.error}`)
  }

  return data.jobs_results ?? []
}

function googleJobsResultMatchesAllowedLocation(
  result: SerpApiGoogleJobsResult,
) {
  const searchableText = [
    result.location,
    result.detected_extensions?.work_from_home ? 'remote' : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!searchableText) return true

  const hasBlockedLocation = hasBlockedInternationalLocation(
    searchableText,
    includesLocationTerm,
  )

  if (hasBlockedLocation) return false

  if (result.detected_extensions?.work_from_home) return true

  return hasNorthAmericaLocationIndicator(searchableText, includesLocationTerm)
}

function normalizeApplyOptions(
  applyOptions: SerpApiGoogleJobsApplyOption[] | undefined,
) {
  const uniqueApplyOptions = new Map<string, { title: string; link: string }>()

  for (const applyOption of applyOptions ?? []) {
    if (!applyOption.link) {
      continue
    }

    uniqueApplyOptions.set(applyOption.link, {
      title: applyOption.title?.trim() || 'Apply',
      link: applyOption.link,
    })
  }

  return Array.from(uniqueApplyOptions.values())
}

function mergeApplyOptions(
  current: GoogleJobsDiscoveredJob['applyOptions'],
  incoming: GoogleJobsDiscoveredJob['applyOptions'],
) {
  const merged = new Map(current.map((option) => [option.link, option]))

  for (const option of incoming) {
    merged.set(option.link, option)
  }

  return Array.from(merged.values())
}

function getGoogleJobsLocation(result: SerpApiGoogleJobsResult) {
  const location = result.location?.trim()

  if (location) {
    return location
  }

  return result.detected_extensions?.work_from_home ? 'Remote' : 'Not specified'
}

function normalizeGoogleJobsResult(
  result: SerpApiGoogleJobsResult,
): GoogleJobsDiscoveredJob | null {
  const title = result.title?.trim()
  const company = result.company_name?.trim() || 'Unknown company'
  const location = getGoogleJobsLocation(result)
  const applyOptions = normalizeApplyOptions(result.apply_options)

  if (!title || applyOptions.length === 0) {
    return null
  }

  return {
    title,
    company,
    location,
    workFromHome: Boolean(result.detected_extensions?.work_from_home),
    postedAt: result.detected_extensions?.posted_at?.trim() || null,
    applyOptions,
  }
}

export async function searchGoogleJobsForServiceNow() {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    console.warn(
      'SERPAPI_API_KEY is missing; Google Jobs discovery will return no URLs.',
    )

    return []
  }

  const jobsByKey = new Map<string, GoogleJobsDiscoveredJob>()

  for (const query of GOOGLE_JOBS_QUERIES) {
    try {
      const jobResults = await searchGoogleJobsApi(query, apiKey)

      for (const result of jobResults) {
        if (!googleJobsResultMatchesAllowedLocation(result)) {
          continue
        }

        const normalizedJob = normalizeGoogleJobsResult(result)

        if (!normalizedJob) {
          continue
        }

        const key = [
          normalizedJob.title,
          normalizedJob.company,
          normalizedJob.location,
        ]
          .join('::')
          .toLowerCase()
        const existingJob = jobsByKey.get(key)

        if (existingJob) {
          existingJob.applyOptions = mergeApplyOptions(
            existingJob.applyOptions,
            normalizedJob.applyOptions,
          )
        } else {
          jobsByKey.set(key, normalizedJob)
        }

        if (jobsByKey.size >= MAX_GOOGLE_JOBS) {
          return Array.from(jobsByKey.values())
        }
      }
    } catch (error) {
      console.warn(`SerpAPI Google Jobs query failed: ${query}`)
      console.warn(error)
    }
  }

  return Array.from(jobsByKey.values())
}
