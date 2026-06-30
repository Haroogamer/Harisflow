import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

const ATS_PLATFORM = 'ultipro'
const REQUEST_USER_AGENT = 'Mozilla/5.0 (compatible; Harisflow/1.0)'
const PAGE_SIZE = 50
const MAX_PAGES = 20
const ULTIPRO_HOST_PATTERN = /^recruiting(?:2)?\.ultipro\.(?:com|ca)$/i
const ULTIPRO_BOARD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEARCH_BODY = {
  opportunitySearch: {
    Top: PAGE_SIZE,
    Skip: 0,
    QueryString: '',
    OrderBy: [
      {
        Value: 'postedDateDesc',
        PropertyName: 'PostedDate',
        Ascending: false,
      },
    ],
    Filters: [],
  },
  matchCriteria: {
    PreferredJobs: [],
    Educations: [],
    LicenseAndCertifications: [],
    Skills: [],
    hasNoLicenses: false,
    SkippedSkills: [],
  },
}

export type UltiproCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'ultipro'
}

type NormalizedUltiproJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type UltiproAddress = {
  City?: string
  State?: {
    Code?: string
    Name?: string
  }
  Country?: {
    Name?: string
  }
}

type UltiproLocation = {
  LocalizedName?: string
  Address?: UltiproAddress
}

type UltiproOpportunity = {
  Id?: string
  Title?: string
  PostedDate?: string
  BriefDescription?: string
  Locations?: UltiproLocation[]
}

type UltiproSearchResponse = {
  opportunities?: UltiproOpportunity[]
  totalCount?: number | null
}

type UltiproDetailResponse = {
  Description?: string
  Qualifications?: string
  Responsibilities?: string
}

function getUltiproSiteConfig(baseUrl: string) {
  const url = new URL(baseUrl)
  const hostname = url.hostname.toLowerCase()
  const pathParts = url.pathname.split('/').filter(Boolean)
  const companyCode = pathParts[0] ?? ''
  const jobBoardIndex = pathParts.findIndex(
    (part) => part.toLowerCase() === 'jobboard',
  )
  const boardId = jobBoardIndex === -1 ? '' : pathParts[jobBoardIndex + 1] ?? ''

  if (
    url.protocol !== 'https:' ||
    !ULTIPRO_HOST_PATTERN.test(hostname) ||
    !/^[a-zA-Z0-9]+$/u.test(companyCode) ||
    !ULTIPRO_BOARD_ID_PATTERN.test(boardId) ||
    !companyCode ||
    !boardId
  ) {
    throw new Error(`Invalid UltiPro careers URL: ${baseUrl}`)
  }

  let origin: string

  switch (hostname) {
    case 'recruiting.ultipro.com':
      origin = 'https://recruiting.ultipro.com'
      break
    case 'recruiting2.ultipro.com':
      origin = 'https://recruiting2.ultipro.com'
      break
    case 'recruiting.ultipro.ca':
      origin = 'https://recruiting.ultipro.ca'
      break
    case 'recruiting2.ultipro.ca':
      origin = 'https://recruiting2.ultipro.ca'
      break
    default:
      throw new Error(`Invalid UltiPro careers URL: ${baseUrl}`)
  }

  return {
    origin,
    companyCode,
    boardId,
  }
}

function generateUltiproJobHash(
  job: Pick<JobHunterJob, 'ats_platform' | 'company' | 'title' | 'location' | 'job_url'>,
) {
  return createHash('sha256')
    .update(
      [
        job.ats_platform,
        job.company,
        job.title,
        job.location,
        job.job_url,
      ].join(':'),
    )
    .digest('hex')
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildLocation(location?: UltiproLocation) {
  const city = location?.Address?.City
  const state =
    location?.Address?.State?.Name ?? location?.Address?.State?.Code
  const country = location?.Address?.Country?.Name
  const parts = [city, state, country].filter(Boolean)

  return parts.join(', ') || location?.LocalizedName || 'Not specified'
}

async function fetchUltiproSearchPage(
  config: UltiproCompanyConfig,
  skip: number,
) {
  const { origin, companyCode, boardId } = getUltiproSiteConfig(config.baseUrl)
  const response = await fetch(
    `${origin}/${companyCode}/JobBoard/${boardId}/JobBoardView/LoadSearchResults`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': REQUEST_USER_AGENT,
      },
      body: JSON.stringify({
        ...SEARCH_BODY,
        opportunitySearch: {
          ...SEARCH_BODY.opportunitySearch,
          Skip: skip,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch UltiPro jobs: ${response.status} ${errorBody}`,
    )
  }

  return (await response.json()) as UltiproSearchResponse
}

async function fetchUltiproJobs(config: UltiproCompanyConfig) {
  const jobs: UltiproOpportunity[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const skip = page * PAGE_SIZE
    const data = await fetchUltiproSearchPage(config, skip)
    const opportunities = data.opportunities ?? []

    jobs.push(...opportunities)

    if (
      opportunities.length === 0 ||
      jobs.length >= (data.totalCount ?? 0) ||
      opportunities.length < PAGE_SIZE
    ) {
      break
    }
  }

  return jobs
}

async function fetchUltiproJobDetail(
  config: UltiproCompanyConfig,
  opportunityId: string,
) {
  const { origin, companyCode, boardId } = getUltiproSiteConfig(config.baseUrl)
  const response = await fetch(
    `${origin}/${companyCode}/JobBoard/${boardId}/JobBoardView/GetJob?opportunityId=${encodeURIComponent(opportunityId)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': REQUEST_USER_AGENT,
      },
    },
  )

  if (!response.ok) {
    return null
  }

  return (await response.json()) as UltiproDetailResponse
}

function normalizeJob(
  config: UltiproCompanyConfig,
  opportunity: UltiproOpportunity,
  detail: UltiproDetailResponse | null,
) {
  const { origin, companyCode, boardId } = getUltiproSiteConfig(config.baseUrl)
  const title = opportunity.Title ?? ''
  const location = buildLocation(opportunity.Locations?.[0])
  const jobUrl = `${origin}/${companyCode}/JobBoard/${boardId}/OpportunityDetail?opportunityId=${opportunity.Id}`
  const rawDescription = [
    detail?.Description,
    detail?.Responsibilities,
    detail?.Qualifications,
    opportunity.BriefDescription,
  ]
    .filter(Boolean)
    .join(' ')
  const jobDescription = rawDescription ? stripHtml(rawDescription) : null

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: opportunity.PostedDate ?? null,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedUltiproJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateUltiproJobHash(jobWithoutHash),
  }
}

export async function crawlUltiproCompany(
  config: UltiproCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? RECENT_JOB_MAX_AGE_DAYS
  const opportunities = await fetchUltiproJobs(config)
  const recentOpportunities = opportunities.filter((opportunity) =>
    isJobRecent(opportunity.PostedDate, maxAgeDays),
  )

  const normalizedJobs = await Promise.all(
    recentOpportunities.map(async (opportunity) => {
      if (!opportunity.Id) {
        return null
      }

      try {
        const detail = await fetchUltiproJobDetail(config, opportunity.Id)

        return normalizeJob(config, opportunity, detail)
      } catch {
        return normalizeJob(config, opportunity, null)
      }
    }),
  )

  return normalizedJobs.filter((job): job is NormalizedUltiproJob =>
    Boolean(job),
  )
}
