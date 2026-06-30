const SERPAPI_SEARCH_URL = 'https://serpapi.com/search.json'
const MAX_DISCOVERED_URLS = 20

export const SEARCH_DISCOVERY_QUERIES = [
  'site:myworkdayjobs.com ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Architect ("United States" OR USA OR Canada OR Remote)',
  'site:boards.greenhouse.io ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:jobs.lever.co ServiceNow Developer ("United States" OR USA OR Canada OR Remote)',
  'site:myworkdayjobs.com ServiceNow Remote',
  'site:myworkdayjobs.com ServiceNow Canada',
  'site:myworkdayjobs.com ServiceNow USA',
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

const US_STATE_NAMES = [
  'alabama',
  'alaska',
  'arizona',
  'arkansas',
  'california',
  'colorado',
  'connecticut',
  'delaware',
  'florida',
  'georgia',
  'hawaii',
  'idaho',
  'illinois',
  'indiana',
  'iowa',
  'kansas',
  'kentucky',
  'louisiana',
  'maine',
  'maryland',
  'massachusetts',
  'michigan',
  'minnesota',
  'mississippi',
  'missouri',
  'montana',
  'nebraska',
  'nevada',
  'new hampshire',
  'new jersey',
  'new mexico',
  'new york',
  'north carolina',
  'north dakota',
  'ohio',
  'oklahoma',
  'oregon',
  'pennsylvania',
  'rhode island',
  'south carolina',
  'south dakota',
  'tennessee',
  'texas',
  'utah',
  'vermont',
  'virginia',
  'washington',
  'west virginia',
  'wisconsin',
  'wyoming',
  'district of columbia',
  'washington dc',
]

const US_STATE_ABBREVIATIONS_PATTERN =
  /\b[a-z][a-z .'-]*,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy|dc)\b/

const BLOCKED_LOCATION_TERMS = [
  'india',
  'uk',
  'united kingdom',
  'germany',
  'france',
  'spain',
  'netherlands',
  'singapore',
  'australia',
  'philippines',
  'mexico',
  'brazil',
]

function includesLocationTerm(text: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const normalizedTerm = escapedTerm.replace(/\s+/g, '\\s+')
  const termPattern = new RegExp(`(^|[^a-z0-9])${normalizedTerm}($|[^a-z0-9])`)

  return termPattern.test(text)
}

function hasUsStateIndicator(text: string) {
  if (
    US_STATE_NAMES.some((term) =>
      includesLocationTerm(text, term),
    )
  ) {
    return true
  }

  return US_STATE_ABBREVIATIONS_PATTERN.test(text)
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
    ) || hasUsStateIndicator(searchableText)
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
