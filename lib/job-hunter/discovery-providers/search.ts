import type { SupportedAtsPlatform } from '@/lib/job-hunter/crawlers/registry'
import {
  analyzeJobSourceUrl,
  normalizeJobSourceCareersUrl,
} from '@/lib/job-hunter/source-analyzer'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

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

const DEFAULT_INTERNET_DISCOVERY_LIMIT = 40
const MS_PER_MINUTE = 60 * 1000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const MS_PER_WEEK = 7 * MS_PER_DAY

const INTERNET_DISCOVERY_QUERIES = [
  'ServiceNow Developer jobs United States',
  'ServiceNow Architect jobs United States',
  'ServiceNow Administrator jobs United States',
  'ServiceNow Engineer jobs United States',
  'ServiceNow Platform Engineer jobs United States',
  'ServiceNow Consultant jobs United States',
  'ServiceNow Analyst jobs United States',
  'ITSM Developer jobs United States',
  'ITOM Engineer jobs United States',
  'CMDB Engineer jobs United States',
  'ServiceNow jobs remote United States',
  'ServiceNow jobs hybrid United States',
]

type SerpApiDetectedExtensions = {
  posted_at?: string
  [key: string]: unknown
}

type SerpApiApplyOption = {
  title?: string
  link?: string
  [key: string]: unknown
}

type SerpApiRelatedLink = {
  text?: string
  link?: string
  [key: string]: unknown
}

type SerpApiJobResult = {
  title?: string
  job_id?: string
  apply_options?: SerpApiApplyOption[]
  related_links?: SerpApiRelatedLink[]
  share_link?: string
  detected_extensions?: SerpApiDetectedExtensions
  [key: string]: unknown
}

type SerpApiGoogleJobsResponse = {
  jobs_results?: SerpApiJobResult[]
}

const AGGREGATOR_HOSTNAMES = new Set([
  'linkedin.com',
  'www.linkedin.com',
  'indeed.com',
  'www.indeed.com',
  'builtin.com',
  'www.builtin.com',
  'bebee.com',
  'www.bebee.com',
  'glassdoor.com',
  'www.glassdoor.com',
  'ziprecruiter.com',
  'www.ziprecruiter.com',
  'monster.com',
  'www.monster.com',
  'careerbuilder.com',
  'www.careerbuilder.com',
  'simplyhired.com',
  'www.simplyhired.com',
  'dice.com',
  'www.dice.com',
  'jobs.google.com',
  'careers.google.com',
])

// Base domains used for subdomain matching (e.g. uk.indeed.com, m.linkedin.com)
const AGGREGATOR_BASE_DOMAINS = new Set([
  'linkedin.com',
  'indeed.com',
  'builtin.com',
  'bebee.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'monster.com',
  'careerbuilder.com',
  'simplyhired.com',
  'dice.com',
])

function isAggregatorUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (AGGREGATOR_HOSTNAMES.has(hostname)) {
      return true
    }
    // Catch regional/subdomain variants (e.g. uk.indeed.com, m.linkedin.com)
    for (const baseDomain of AGGREGATOR_BASE_DOMAINS) {
      if (hostname.endsWith(`.${baseDomain}`)) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
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

  const amount = Number.parseInt(match[1], 10)
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

function extractCandidateLinks(job: SerpApiJobResult): {
  hasApplyOptions: boolean
  primaryLink: string | null
  orderedLinks: string[]
} {
  const applyLinks = (job.apply_options?.map((o) => o.link) ?? []).filter(
    (link): link is string => Boolean(link),
  )
  const relatedLinks = (job.related_links?.map((l) => l.link) ?? []).filter(
    (link): link is string => Boolean(link),
  )
  const shareLinks = job.share_link ? [job.share_link] : []

  const allLinks = [...applyLinks, ...relatedLinks, ...shareLinks]
  const primaryLink = allLinks[0] ?? null

  // Prioritize non-aggregator links so ATS detection runs on them first
  const nonAggregatorLinks = allLinks.filter((l) => !isAggregatorUrl(l))
  const aggregatorLinks = allLinks.filter((l) => isAggregatorUrl(l))
  const orderedLinks = [...nonAggregatorLinks, ...aggregatorLinks]

  return {
    hasApplyOptions: applyLinks.length > 0,
    primaryLink,
    orderedLinks,
  }
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
  const organicResults = (data as { organic_results?: unknown[] }).organic_results
  const jobsResults = data.jobs_results ?? []

  console.info('[job-hunter] SerpAPI response shape', {
    query,
    organicResultsExists: Array.isArray(organicResults),
    organicResultsLength: Array.isArray(organicResults) ? organicResults.length : 0,
    firstResultKeys:
      jobsResults.length > 0 && typeof jobsResults[0] === 'object'
        ? Object.keys(jobsResults[0])
        : [],
  })

  return data.jobs_results ?? []
}

async function fetchGoogleJobListingResult(jobId: string, apiKey: string) {
  const url = new URL('https://serpapi.com/search.json')

  url.searchParams.set('engine', 'google_jobs_listing')
  url.searchParams.set('q', jobId)
  url.searchParams.set('hl', 'en')
  url.searchParams.set('gl', 'us')
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url.toString(), {
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `SerpApi job listing request failed with status ${response.status}: ${body}`,
    )
  }

  const data = (await response.json()) as SerpApiJobResult

  return data
}

const MAX_REJECTED_SAMPLES = 10
const MAX_RESOLVED_SAMPLES = 10
const INTERNET_DISCOVERY_MAX_POST_AGE_MS = RECENT_JOB_MAX_AGE_DAYS * MS_PER_DAY

type RejectedSample = {
  title: string
  url: string
  posted_at: string | null
  rejectionReason: string
}

type ResolvedSample = {
  title: string
  originalUrl: string
  resolvedUrl: string
  detectedAts: string
}

type InternetDiscoveryDiagnostics = {
  serpResultsReceived: number
  resultsWithUrl: number
  resultsWithPostedAt: number
  resultsRejectedByDate: number
  resultsRejectedUnsupportedAts: number
  supportedAtsUrlsFound: number
  urlsReturned: number
  atsCounts: Partial<Record<SupportedAtsPlatform, number>>
  aggregatorResults: number
  resultsWithApplyOptions: number
  directAtsLinksResolved: number
  unresolvedAggregatorResults: number
  jobDetailLookups: number
  jobDetailLookupFailures: number
  jobDetailLinksResolved: number
  rejectedSamples: RejectedSample[]
  resolvedSamples: ResolvedSample[]
}

type InternetDiscoverySource = {
  url: string
  atsPlatform: SupportedAtsPlatform
  postedAt: number | null
}

export type InternetDiscoveryResult = {
  urls: string[]
  diagnostics: InternetDiscoveryDiagnostics
}

function addRejectedSample(
  rejectedSamples: RejectedSample[],
  sample: RejectedSample,
) {
  if (rejectedSamples.length < MAX_REJECTED_SAMPLES) {
    rejectedSamples.push(sample)
  }
}

function addResolvedSample(
  resolvedSamples: ResolvedSample[],
  sample: ResolvedSample,
) {
  if (resolvedSamples.length < MAX_RESOLVED_SAMPLES) {
    resolvedSamples.push(sample)
  }
}

export async function getLatestInternetAtsJobUrls(options?: {
  maxSources?: number
}): Promise<InternetDiscoveryResult> {
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
  const freshnessThreshold = now.getTime() - INTERNET_DISCOVERY_MAX_POST_AGE_MS
  const latestSourcesByUrl = new Map<string, InternetDiscoverySource>()
  const diagnostics: InternetDiscoveryDiagnostics = {
    serpResultsReceived: allJobs.length,
    resultsWithUrl: 0,
    resultsWithPostedAt: 0,
    resultsRejectedByDate: 0,
    resultsRejectedUnsupportedAts: 0,
    supportedAtsUrlsFound: 0,
    urlsReturned: 0,
    atsCounts: {},
    aggregatorResults: 0,
    resultsWithApplyOptions: 0,
    directAtsLinksResolved: 0,
    unresolvedAggregatorResults: 0,
    jobDetailLookups: 0,
    jobDetailLookupFailures: 0,
    jobDetailLinksResolved: 0,
    rejectedSamples: [],
    resolvedSamples: [],
  }
  const listingResultByJobId = new Map<string, SerpApiJobResult | null>()

  for (const job of allJobs) {
    const postedAtRaw = job.detected_extensions?.posted_at
    const postedAtValue = postedAtRaw != null ? String(postedAtRaw).trim() : ''
    const postedAt = parsePostedAtToTimestamp(
      postedAtRaw != null ? String(postedAtRaw) : undefined,
      now,
    )
    const { hasApplyOptions, primaryLink, orderedLinks } = extractCandidateLinks(job)
    const jobId = typeof job.job_id === 'string' ? job.job_id.trim() : ''
    const title = job.title != null ? String(job.title) : 'Untitled job'

    if (postedAtValue) {
      diagnostics.resultsWithPostedAt += 1
    }

    if (hasApplyOptions) {
      diagnostics.resultsWithApplyOptions += 1
    }

    let allCandidateLinks = [...orderedLinks]
    let usedJobListingDetails = false
    const shouldLookupJobListingDetails =
      jobId.length > 0 &&
      (allCandidateLinks.length === 0 ||
        allCandidateLinks.every((link) => isAggregatorUrl(link)))

    if (shouldLookupJobListingDetails) {
      let listingResult = listingResultByJobId.get(jobId)

      if (listingResult === undefined) {
        diagnostics.jobDetailLookups += 1

        try {
          listingResult = await fetchGoogleJobListingResult(jobId, apiKey)
          listingResultByJobId.set(jobId, listingResult)
        } catch {
          diagnostics.jobDetailLookupFailures += 1
          listingResultByJobId.set(jobId, null)
          listingResult = null
        }
      }

      if (listingResult) {
        const detailLinks = extractCandidateLinks(listingResult).orderedLinks

        if (detailLinks.length > 0) {
          allCandidateLinks = Array.from(
            new Set([...allCandidateLinks, ...detailLinks]),
          )
          usedJobListingDetails = true
        }
      }
    }

    if (allCandidateLinks.length === 0) {
      addRejectedSample(diagnostics.rejectedSamples, {
        title,
        url: '',
        posted_at: postedAtValue || null,
        rejectionReason: 'missing_url',
      })
      continue
    }

    diagnostics.resultsWithUrl += 1

    if (postedAt !== null && postedAt < freshnessThreshold) {
      diagnostics.resultsRejectedByDate += 1
      addRejectedSample(diagnostics.rejectedSamples, {
        title,
        url: primaryLink ?? '',
        posted_at: postedAtValue || null,
        rejectionReason: 'stale_posted_at',
      })
      continue
    }

    const isPrimaryAggregator =
      primaryLink !== null && isAggregatorUrl(primaryLink)

    if (isPrimaryAggregator) {
      diagnostics.aggregatorResults += 1
    }

    let foundSupportedAtsForResult = false
    let firstResolvedUrl: string | null = null
    let firstResolvedAts: string | null = null

    for (const link of allCandidateLinks) {
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

      if (!foundSupportedAtsForResult) {
        firstResolvedUrl = careersUrl
        firstResolvedAts = candidate.ats_platform
      }

      foundSupportedAtsForResult = true
      const existing = latestSourcesByUrl.get(careersUrl)

      if (!existing) {
        latestSourcesByUrl.set(careersUrl, {
          url: careersUrl,
          atsPlatform: candidate.ats_platform,
          postedAt,
        })
        continue
      }

      if (
        postedAt !== null &&
        (existing.postedAt === null || postedAt > existing.postedAt)
      ) {
        latestSourcesByUrl.set(careersUrl, {
          url: careersUrl,
          atsPlatform: candidate.ats_platform,
          postedAt,
        })
      }
    }

    if (isPrimaryAggregator) {
      if (foundSupportedAtsForResult) {
        diagnostics.directAtsLinksResolved += 1
        if (usedJobListingDetails) {
          diagnostics.jobDetailLinksResolved += 1
        }
        if (
          primaryLink !== null &&
          firstResolvedUrl !== null &&
          firstResolvedAts !== null
        ) {
          addResolvedSample(diagnostics.resolvedSamples, {
            title,
            originalUrl: primaryLink,
            resolvedUrl: firstResolvedUrl,
            detectedAts: firstResolvedAts,
          })
        }
      } else {
        diagnostics.unresolvedAggregatorResults += 1
      }
    }

    if (!foundSupportedAtsForResult) {
      diagnostics.resultsRejectedUnsupportedAts += 1
      addRejectedSample(diagnostics.rejectedSamples, {
        title,
        url: primaryLink ?? '',
        posted_at: postedAtValue || null,
        rejectionReason: 'unsupported_ats',
      })
    }
  }

  const sortedSources = Array.from(latestSourcesByUrl.values()).sort((a, b) => {
    const aScore = a.postedAt ?? Number.NEGATIVE_INFINITY
    const bScore = b.postedAt ?? Number.NEGATIVE_INFINITY
    return bScore - aScore
  })
  const selectedSources = sortedSources.slice(0, maxSources)

  // Count ATS distribution across all supported URLs discovered before maxSources slicing.
  for (const source of sortedSources) {
    diagnostics.atsCounts[source.atsPlatform] =
      (diagnostics.atsCounts[source.atsPlatform] ?? 0) + 1
  }

  diagnostics.supportedAtsUrlsFound = sortedSources.length
  diagnostics.urlsReturned = selectedSources.length

  return {
    urls: selectedSources.map((source) => source.url),
    diagnostics,
  }
}
