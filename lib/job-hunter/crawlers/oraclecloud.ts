import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'

const ATS_PLATFORM = 'oraclecloud'
const PAGE_SIZE = 100
const MAX_PAGES = 10
const REQUEST_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; Harisflow/1.0)',
  'ora-irc-language': 'en',
}

export type OracleCloudCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'oraclecloud'
}

type NormalizedOracleCloudJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type OracleSecondaryLocation = {
  Name?: string
}

type OracleRequisition = {
  Id?: string
  Title?: string
  PostedDate?: string
  PrimaryLocation?: string
  ExternalURL?: string
  ShortDescriptionStr?: string
  secondaryLocations?: OracleSecondaryLocation[]
}

type OracleRequisitionDetail = {
  Id?: string
  Title?: string
  PrimaryLocation?: string
  ExternalDescriptionStr?: string
  ExternalQualificationsStr?: string
  ExternalResponsibilitiesStr?: string
  ExternalPostedStartDate?: string
  ExternalURL?: string
  secondaryLocations?: OracleSecondaryLocation[]
}

type OracleListPage = {
  TotalJobsCount?: number
  requisitionList?: OracleRequisition[]
}

type OracleListResponse = {
  items?: OracleListPage[]
}

type OracleDetailResponse = {
  items?: OracleRequisitionDetail[]
}

function getOracleSiteConfig(baseUrl: string) {
  const url = new URL(baseUrl)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const candidateExperienceIndex = pathParts.findIndex(
    (part) => part === 'CandidateExperience',
  )
  const sitesIndex = pathParts.findIndex((part) => part === 'sites')
  const siteNumber = sitesIndex === -1 ? '' : pathParts[sitesIndex + 1] ?? ''

  if (candidateExperienceIndex === -1 || !siteNumber) {
    throw new Error(`Invalid Oracle Cloud careers URL: ${baseUrl}`)
  }

  const locale = pathParts[candidateExperienceIndex + 1] ?? 'en'
  const language = locale.split('-')[0] || 'en'

  return {
    origin: url.origin,
    siteNumber,
    locale,
    language,
  }
}

function generateOracleCloudJobHash(
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

function buildLocation(
  primaryLocation?: string,
  secondaryLocations?: OracleSecondaryLocation[],
) {
  const locations = [primaryLocation, ...(secondaryLocations ?? []).map((item) => item.Name)]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)

  return locations.join('; ') || 'Not specified'
}

function buildDescription(detail?: OracleRequisitionDetail, fallback?: OracleRequisition) {
  if (!detail) {
    return fallback?.ShortDescriptionStr
      ? stripHtml(fallback.ShortDescriptionStr)
      : null
  }

  const descriptionParts = [
    detail.ExternalDescriptionStr,
    detail.ExternalResponsibilitiesStr,
    detail.ExternalQualificationsStr,
  ].filter(Boolean)

  if (descriptionParts.length === 0) {
    return fallback?.ShortDescriptionStr
      ? stripHtml(fallback.ShortDescriptionStr)
      : null
  }

  return stripHtml(descriptionParts.join(' '))
}

async function fetchOracleCloudJobList(baseUrl: string) {
  const { origin, siteNumber, language } = getOracleSiteConfig(baseUrl)
  const jobs: OracleRequisition[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE
    const finder = `findReqs;siteNumber=${siteNumber},limit=${PAGE_SIZE},offset=${offset},sortBy=POSTING_DATES_DESC`
    const response = await fetch(
      `${origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${encodeURIComponent(finder)}`,
      {
        headers: {
          ...REQUEST_HEADERS,
          'ora-irc-language': language,
        },
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()

      throw new Error(
        `Failed to fetch Oracle Cloud jobs: ${response.status} ${errorBody}`,
      )
    }

    const data = (await response.json()) as OracleListResponse
    const pageData = data.items?.[0]
    const requisitions = pageData?.requisitionList ?? []

    jobs.push(...requisitions)

    if (
      requisitions.length < PAGE_SIZE ||
      jobs.length >= (pageData?.TotalJobsCount ?? 0)
    ) {
      break
    }
  }

  return jobs
}

async function fetchOracleCloudJobDetail(baseUrl: string, jobId: string) {
  const { origin, siteNumber, language } = getOracleSiteConfig(baseUrl)
  const finder = `ById;Id="${jobId}",siteNumber=${siteNumber}`
  const response = await fetch(
    `${origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=${encodeURIComponent(finder)}`,
    {
      headers: {
        ...REQUEST_HEADERS,
        'ora-irc-language': language,
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Oracle Cloud job detail: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as OracleDetailResponse

  return data.items?.[0] ?? null
}

function normalizeJob(
  config: OracleCloudCompanyConfig,
  listing: OracleRequisition,
  detail: OracleRequisitionDetail | null,
) {
  const { origin, siteNumber, locale } = getOracleSiteConfig(config.baseUrl)
  const jobId = detail?.Id ?? listing.Id ?? ''
  const title = detail?.Title ?? listing.Title ?? ''
  const location = buildLocation(
    detail?.PrimaryLocation ?? listing.PrimaryLocation,
    detail?.secondaryLocations ?? listing.secondaryLocations,
  )
  const jobUrl =
    detail?.ExternalURL ??
    listing.ExternalURL ??
    `${origin}/hcmUI/CandidateExperience/${locale}/sites/${siteNumber}/job/${jobId}`
  const datePosted = detail?.ExternalPostedStartDate ?? listing.PostedDate ?? null
  const jobDescription = buildDescription(detail ?? undefined, listing)

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: datePosted,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedOracleCloudJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateOracleCloudJobHash(jobWithoutHash),
  }
}

export async function crawlOracleCloudCompany(
  config: OracleCloudCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? 14
  const listings = await fetchOracleCloudJobList(config.baseUrl)
  const recentListings = listings.filter((listing) =>
    isJobRecent(listing.PostedDate, maxAgeDays),
  )

  const normalizedJobs = await Promise.all(
    recentListings.map(async (listing) => {
      if (!listing.Id) {
        return null
      }

      try {
        const detail = await fetchOracleCloudJobDetail(config.baseUrl, listing.Id)

        return normalizeJob(config, listing, detail)
      } catch {
        return normalizeJob(config, listing, null)
      }
    }),
  )

  return normalizedJobs.filter((job): job is NormalizedOracleCloudJob =>
    Boolean(job),
  )
}
