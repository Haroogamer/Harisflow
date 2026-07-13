import type { SupportedAtsPlatform } from '@/lib/job-hunter/crawlers/registry'
import {
  analyzeJobSourceUrl,
  normalizeJobSourceCareersUrl,
} from '@/lib/job-hunter/source-analyzer'

type AtsSeedGroup = {
  atsPlatform: SupportedAtsPlatform
  urls: string[]
}

export const DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM = 2

const PRIORITIZED_ATS_SEED_GROUPS: AtsSeedGroup[] = [
  {
    atsPlatform: 'greenhouse',
    urls: [
      'https://boards.greenhouse.io/servicenow',
      'https://boards.greenhouse.io/datadog',
      'https://boards.greenhouse.io/cloudflare',
      'https://boards.greenhouse.io/okta',
      'https://boards.greenhouse.io/hubspot',
      'https://boards.greenhouse.io/coinbase',
    ],
  },
  {
    atsPlatform: 'lever',
    urls: [
      'https://jobs.lever.co/snowflake',
      'https://jobs.lever.co/atlassian',
      'https://jobs.lever.co/airtable',
      'https://jobs.lever.co/openai',
    ],
  },
  {
    atsPlatform: 'ashby',
    urls: [
      'https://jobs.ashbyhq.com/notion',
      'https://jobs.ashbyhq.com/figma',
      'https://jobs.ashbyhq.com/ramp',
      'https://jobs.ashbyhq.com/retool',
    ],
  },
  {
    atsPlatform: 'smartrecruiters',
    urls: [
      'https://careers.smartrecruiters.com/Visa',
      'https://careers.smartrecruiters.com/Dynatrace',
    ],
  },
  {
    atsPlatform: 'icims',
    urls: [
      'https://careers-fisglobal.icims.com/jobs/search',
      'https://careers-splunk.icims.com/jobs/search',
    ],
  },
  {
    atsPlatform: 'dayforce',
    urls: [
      'https://jobs.dayforcehcm.com/en-US/mydayforce/alljobs',
      'https://jobs.dayforcehcm.com/en-US/trimble/alljobs',
    ],
  },
  {
    atsPlatform: 'oraclecloud',
    urls: [
      'https://edel.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/jobs',
      'https://hcrw.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
    ],
  },
  {
    atsPlatform: 'workday',
    urls: [
      'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
      'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite',
      'https://target.wd5.myworkdayjobs.com/en-US/targetcareers',
      'https://bah.wd1.myworkdayjobs.com/en-US/BAH_Jobs',
    ],
  },
  {
    atsPlatform: 'ultipro',
    urls: [
      'https://recruiting.ultipro.ca/PAS5000PASON/JobBoard/e2d2ceaa-a04e-4f8f-a0e0-0c6b5a89397c',
      'https://recruiting2.ultipro.com/UHG1004UHG/JobBoard/0f7f8c8c-2ee2-4a6f-b191-17648d5f33e0',
    ],
  },
]

const BROADER_ATS_SEED_GROUPS: AtsSeedGroup[] = [
  {
    atsPlatform: 'workday',
    urls: [
      'https://mantech.wd1.myworkdayjobs.com/en-US/External',
      'https://proofpoint.wd5.myworkdayjobs.com/ProofpointCareers',
      'https://cvshealth.wd1.myworkdayjobs.com/en-US/CVS_Health_Careers',
      'https://generalmotors.wd5.myworkdayjobs.com/en-US/Careers_GM',
      'https://dell.wd1.myworkdayjobs.com/External',
      'https://mars.wd3.myworkdayjobs.com/en-US/External',
      'https://msd.wd5.myworkdayjobs.com/en-US/SearchJobs',
      'https://wholefoods.wd5.myworkdayjobs.com/en-US/wholefoods',
    ],
  },
  {
    atsPlatform: 'smartrecruiters',
    urls: [
      'https://careers.smartrecruiters.com/DocuSign',
      'https://careers.smartrecruiters.com/NIKE',
    ],
  },
  {
    atsPlatform: 'icims',
    urls: [
      'https://careers-intuitive.icims.com/jobs/search',
      'https://careers-paychex.icims.com/jobs/search',
    ],
  },
  {
    atsPlatform: 'dayforce',
    urls: [
      'https://jobs.dayforcehcm.com/en-US/allstate/alljobs',
      'https://jobs.dayforcehcm.com/en-US/adayinlife/alljobs',
    ],
  },
]

function flattenSeedGroups(groups: AtsSeedGroup[]) {
  return groups.flatMap((group) => group.urls)
}

function dedupeUrls(urls: string[]) {
  return Array.from(new Set(urls))
}

export function getPrioritizedAtsJobUrls() {
  return dedupeUrls(flattenSeedGroups(PRIORITIZED_ATS_SEED_GROUPS))
}

export function getBroaderAtsJobUrls() {
  return dedupeUrls(flattenSeedGroups(BROADER_ATS_SEED_GROUPS))
}

export function getBalancedAtsJobUrls(options?: {
  includeBroader?: boolean
  maxPerPlatform?: number
}) {
  const includeBroader = options?.includeBroader ?? false
  const requestedMaxPerPlatform =
    options?.maxPerPlatform ?? DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM
  const maxPerPlatform =
    requestedMaxPerPlatform > 0
      ? requestedMaxPerPlatform
      : DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM
  const groups = includeBroader
    ? [...PRIORITIZED_ATS_SEED_GROUPS, ...BROADER_ATS_SEED_GROUPS]
    : PRIORITIZED_ATS_SEED_GROUPS
  const pooledUrls = new Map<SupportedAtsPlatform, string[]>()
  const platformOrder: SupportedAtsPlatform[] = []

  for (const group of groups) {
    const existing = pooledUrls.get(group.atsPlatform) ?? []
    pooledUrls.set(group.atsPlatform, [...existing, ...group.urls])

    if (!platformOrder.includes(group.atsPlatform)) {
      platformOrder.push(group.atsPlatform)
    }
  }

  const limitedUrls = new Map<SupportedAtsPlatform, string[]>()

  for (const [platform, urls] of pooledUrls) {
    limitedUrls.set(platform, dedupeUrls(urls).slice(0, maxPerPlatform))
  }

  const selectedUrls: string[] = []
  const maxRounds = Math.max(
    0,
    ...Array.from(limitedUrls.values(), (urls) => urls.length),
  )

  for (let index = 0; index < maxRounds; index += 1) {
    for (const platform of platformOrder) {
      const urls = limitedUrls.get(platform) ?? []
      const url = urls[index]

      if (url) {
        selectedUrls.push(url)
      }
    }
  }

  return dedupeUrls(selectedUrls)
}

const DEFAULT_INTERNET_DISCOVERY_LIMIT = 15
const MS_PER_MINUTE = 60 * 1000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const MS_PER_WEEK = 7 * MS_PER_DAY

const INTERNET_DISCOVERY_QUERIES = [
  'ServiceNow Developer jobs United States',
  'ServiceNow Architect jobs United States',
  'ServiceNow Administrator jobs United States',
  'ServiceNow Engineer jobs United States',
]

type SerpApiDetectedExtensions = {
  posted_at?: string
}

type SerpApiApplyOption = {
  link?: string
}

type SerpApiRelatedLink = {
  link?: string
}

type SerpApiJobResult = {
  apply_options?: SerpApiApplyOption[]
  related_links?: SerpApiRelatedLink[]
  share_link?: string
  detected_extensions?: SerpApiDetectedExtensions
}

type SerpApiGoogleJobsResponse = {
  jobs_results?: SerpApiJobResult[]
}

function parsePostedAtToTimestamp(value: string | undefined, now: Date) {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (
    normalized.includes('today') ||
    normalized.includes('just posted') ||
    normalized === 'new'
  ) {
    return now.getTime()
  }

  const match = normalized.match(
    /(\d+)\+?\s*(minute|hour|day|week)s?\s*ago/,
  )

  if (!match) {
    return null
  }

  const amount = Number.parseInt(match[1] ?? '0', 10)
  const unit = match[2]

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  const msByUnit: Record<string, number> = {
    minute: MS_PER_MINUTE,
    hour: MS_PER_HOUR,
    day: MS_PER_DAY,
    week: MS_PER_WEEK,
  }
  const ms = msByUnit[unit]

  if (!ms) {
    return null
  }

  return now.getTime() - amount * ms
}

function extractCandidateLinks(job: SerpApiJobResult) {
  const links = [
    ...(job.apply_options?.map((option) => option.link) ?? []),
    ...(job.related_links?.map((link) => link.link) ?? []),
    job.share_link,
  ]

  return links.filter((link): link is string => Boolean(link))
}

async function fetchGoogleJobsResults(query: string, apiKey: string) {
  const url = new URL('https://serpapi.com/search.json')

  url.searchParams.set('engine', 'google_jobs')
  url.searchParams.set('hl', 'en')
  url.searchParams.set('gl', 'us')
  url.searchParams.set('q', query)
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `SerpApi request failed with status ${response.status}: ${body}`,
    )
  }

  const data = (await response.json()) as SerpApiGoogleJobsResponse
  return data.jobs_results ?? []
}

export async function getLatestInternetAtsJobUrls(options?: {
  maxSources?: number
}) {
  const maxSources = options?.maxSources ?? DEFAULT_INTERNET_DISCOVERY_LIMIT
  const apiKey = process.env.SERPAPI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('Missing SERPAPI_API_KEY for internet discovery')
  }

  const now = new Date()
  const queryResults = await Promise.all(
    INTERNET_DISCOVERY_QUERIES.map((query) =>
      fetchGoogleJobsResults(query, apiKey),
    ),
  )
  const allJobs = queryResults.flat()
  const careersUrlToLatestSource = new Map<string, { url: string; postedAt: number }>()

  for (const job of allJobs) {
    const postedAt = parsePostedAtToTimestamp(
      job.detected_extensions?.posted_at,
      now,
    )

    if (postedAt === null) {
      continue
    }

    for (const link of extractCandidateLinks(job)) {
      const candidate = analyzeJobSourceUrl(link)

      if (!candidate) {
        continue
      }

      let careersUrl: string

      try {
        careersUrl = normalizeJobSourceCareersUrl(candidate.careers_url)
      } catch {
        continue
      }
      const existing = careersUrlToLatestSource.get(careersUrl)

      if (!existing || postedAt > existing.postedAt) {
        careersUrlToLatestSource.set(careersUrl, {
          url: careersUrl,
          postedAt,
        })
      }
    }
  }

  return Array.from(careersUrlToLatestSource.values())
    .sort((a, b) => b.postedAt - a.postedAt)
    .slice(0, maxSources)
    .map((entry) => entry.url)
}
