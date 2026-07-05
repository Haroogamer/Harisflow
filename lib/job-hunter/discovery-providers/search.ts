import {
  hasUsStateIndicator,
} from '@/lib/job-hunter/us-location'

const SERPAPI_SEARCH_URL = 'https://serpapi.com/search.json'
const MAX_DISCOVERED_URLS = 20

export const SEARCH_DISCOVERY_QUERIES = [
  // Workday
  'site:myworkdayjobs.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Engineer ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Administrator ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Consultant ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Remote',
  'site:myworkdayjobs.com ServiceNow Canada',
  'site:myworkdayjobs.com ServiceNow USA',
  // Greenhouse
  'site:boards.greenhouse.io ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:boards.greenhouse.io ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  'site:boards.greenhouse.io ServiceNow Engineer ("United States" OR USA OR Canada OR Remote)',
  'site:boards.greenhouse.io ServiceNow Consultant ("United States" OR USA OR Canada OR Remote)',
  // Lever
  'site:jobs.lever.co ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.lever.co ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.lever.co ServiceNow Engineer ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.lever.co ServiceNow Consultant ("United States" OR USA OR Canada OR Remote)',
  // Ashby
  'site:jobs.ashbyhq.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.ashbyhq.com ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.ashbyhq.com ServiceNow Engineer ("United States" OR USA OR Canada OR Remote)',
  // Oracle Cloud
  'site:oraclecloud.com/hcmUI/CandidateExperience ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:oraclecloud.com/hcmUI/CandidateExperience ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  // Dayforce
  'site:jobs.dayforcehcm.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.dayforcehcm.com ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  // UltiPro (recruiting and recruiting2 subdomains)
  'site:recruiting.ultipro.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:recruiting.ultipro.ca ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:recruiting2.ultipro.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  // SmartRecruiters
  'site:careers.smartrecruiters.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:careers.smartrecruiters.com ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  'site:careers.smartrecruiters.com ServiceNow Engineer ("United States" OR USA OR Canada OR Remote)',
  // iCIMS
  'site:icims.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:icims.com ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
]

const GOOGLE_JOBS_QUERIES = [
  'ServiceNow Developer',
  'ServiceNow Architect',
  'ServiceNow Admin',
  'ServiceNow Engineer',
]

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

const ALLOWED_LOCATION_TERMS = [
  'united states',
  'usa',
  'u.s.',
  'canada',
  'remote',
  'new york',
  'michigan',
  'toronto',
  'chicago',
  'dallas',
  'atlanta',
  'washington',
  'virginia',
]

const BLOCKED_LOCATION_TERMS = [
  'india',
  'uk',
  'united kingdom',
  'england',
  'germany',
  'france',
  'spain',
  'netherlands',
  'singapore',
  'australia',
  'philippines',
  'mexico',
  'brazil',
  'ireland',
  'poland',
  'romania',
  'czech republic',
  'hungary',
  'israel',
  'pakistan',
  'uae',
  'united arab emirates',
  'south africa',
  'colombia',
  'argentina',
  'portugal',
  'italy',
  'sweden',
  'denmark',
  'norway',
  'finland',
  'switzerland',
  'belgium',
  'austria',
  'new zealand',
  'malaysia',
  'indonesia',
  'vietnam',
  'japan',
  'china',
  'hong kong',
  'sri lanka',
  'bangladesh',
  'egypt',
  'morocco',
  'nigeria',
  'kenya',
]

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
  const hasBlockedLocation = BLOCKED_LOCATION_TERMS.some((term) =>
    includesLocationTerm(searchableText, term),
  )

  if (hasBlockedLocation) {
    return false
  }

  return (
    ALLOWED_LOCATION_TERMS.some((term) =>
      includesLocationTerm(searchableText, term),
    ) || hasUsStateIndicator(searchableText, includesLocationTerm)
  )
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

  const hasBlockedLocation = BLOCKED_LOCATION_TERMS.some((term) =>
    includesLocationTerm(searchableText, term),
  )

  if (hasBlockedLocation) return false

  if (result.detected_extensions?.work_from_home) return true

  return (
    ALLOWED_LOCATION_TERMS.some((term) =>
      includesLocationTerm(searchableText, term),
    ) || hasUsStateIndicator(searchableText, includesLocationTerm)
  )
}

export async function searchGoogleJobsForServiceNow() {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    console.warn(
      'SERPAPI_API_KEY is missing; Google Jobs discovery will return no URLs.',
    )

    return []
  }

  const urls = new Set<string>()

  for (const query of GOOGLE_JOBS_QUERIES) {
    try {
      const jobResults = await searchGoogleJobsApi(query, apiKey)

      for (const result of jobResults) {
        if (!googleJobsResultMatchesAllowedLocation(result)) {
          continue
        }

        for (const applyOption of result.apply_options ?? []) {
          if (applyOption.link) {
            urls.add(applyOption.link)
          }
        }

        if (urls.size >= MAX_DISCOVERED_URLS) {
          return Array.from(urls)
        }
      }
    } catch (error) {
      console.warn(`SerpAPI Google Jobs query failed: ${query}`)
      console.warn(error)
    }
  }

  return Array.from(urls)
}
