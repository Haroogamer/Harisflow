import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

const ATS_PLATFORM = 'dayforce'
const DAYFORCE_ORIGIN = 'https://jobs.dayforcehcm.com'
const DAYFORCE_HOSTNAME = 'jobs.dayforcehcm.com'
const REQUEST_USER_AGENT = 'Mozilla/5.0 (compatible; Harisflow/1.0)'
const MAX_PAGES = 20

export type DayforceCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'dayforce'
}

type NormalizedDayforceJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type DayforceLocation = {
  formattedAddress?: string
  cityName?: string
  stateCode?: string
  isoCountryCode?: string
}

type DayforceJob = {
  jobPostingId?: number
  jobTitle?: string
  postingLocations?: DayforceLocation[]
  postingStartTimestampUTC?: string | null
  hasVirtualLocation?: boolean
  jobDescription?: string
  jobDetailsUrl?: string
}

type DayforceSearchResponse = {
  jobPostings?: DayforceJob[]
  maxCount?: number
  count?: number
}

function getDayforceSiteConfig(baseUrl: string) {
  const url = new URL(baseUrl)
  const hostname = url.hostname.toLowerCase()
  const pathParts = url.pathname.split('/').filter(Boolean)
  const cultureCode = pathParts[0] ?? ''
  const clientNamespace = pathParts[1] ?? ''
  const jobBoardCode = pathParts[2] ?? ''

  if (
    url.protocol !== 'https:' ||
    hostname !== DAYFORCE_HOSTNAME ||
    !/^[a-z]{2}-[A-Z]{2}$/u.test(cultureCode) ||
    !/^[a-zA-Z0-9_-]+$/u.test(clientNamespace) ||
    !/^[a-zA-Z0-9_-]+$/u.test(jobBoardCode) ||
    !cultureCode ||
    !clientNamespace ||
    !jobBoardCode
  ) {
    throw new Error(`Invalid Dayforce careers URL: ${baseUrl}`)
  }

  return {
    origin: DAYFORCE_ORIGIN,
    cultureCode,
    clientNamespace,
    jobBoardCode,
  }
}

function generateDayforceJobHash(
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

function buildLocation(job: DayforceJob) {
  const formattedLocations = (job.postingLocations ?? [])
    .map((location) => {
      if (location.formattedAddress) {
        return location.formattedAddress
      }

      return [
        location.cityName,
        location.stateCode,
        location.isoCountryCode,
      ]
        .filter(Boolean)
        .join(', ')
    })
    .filter(Boolean)

  if (formattedLocations.length > 0) {
    return formattedLocations.join('; ')
  }

  return job.hasVirtualLocation ? 'Remote' : 'Not specified'
}

function getSetCookies(headers: Headers) {
  const extendedHeaders = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof extendedHeaders.getSetCookie === 'function') {
    return extendedHeaders.getSetCookie()
  }

  const singleCookie = headers.get('set-cookie')

  return singleCookie ? [singleCookie] : []
}

async function getDayforceSession(origin: string) {
  const response = await fetch(`${origin}/api/auth/csrf`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': REQUEST_USER_AGENT,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Dayforce session: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as { csrfToken?: string }
  const cookies = getSetCookies(response.headers)
    .map((value) => value.split(';')[0])
    .join('; ')

  return {
    csrfToken: data.csrfToken ?? '',
    cookies,
  }
}

async function fetchDayforceJobs(config: DayforceCompanyConfig) {
  const siteConfig = getDayforceSiteConfig(config.baseUrl)
  const { csrfToken, cookies } = await getDayforceSession(siteConfig.origin)
  const jobs: DayforceJob[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const paginationStart = page * 25
    const response = await fetch(
      `${siteConfig.origin}/api/geo/${siteConfig.clientNamespace}/jobposting/search`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Origin: siteConfig.origin,
          Referer: `${siteConfig.origin}/${siteConfig.cultureCode}/${siteConfig.clientNamespace}/${siteConfig.jobBoardCode}`,
          'User-Agent': REQUEST_USER_AGENT,
          'x-csrf-token': csrfToken,
          ...(cookies ? { Cookie: cookies } : {}),
        },
        body: JSON.stringify({
          clientNamespace: siteConfig.clientNamespace,
          jobBoardCode: siteConfig.jobBoardCode,
          cultureCode: siteConfig.cultureCode,
          distanceUnit: 1,
          paginationStart,
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()

      throw new Error(
        `Failed to fetch Dayforce jobs: ${response.status} ${errorBody}`,
      )
    }

    const data = (await response.json()) as DayforceSearchResponse
    const jobPostings = data.jobPostings ?? []

    jobs.push(...jobPostings)

    if (
      jobPostings.length === 0 ||
      jobs.length >= (data.maxCount ?? 0) ||
      jobPostings.length < (data.count ?? 25)
    ) {
      break
    }
  }

  return jobs
}

function normalizeJob(
  config: DayforceCompanyConfig,
  dayforceJob: DayforceJob,
) {
  const { origin, cultureCode, clientNamespace, jobBoardCode } =
    getDayforceSiteConfig(config.baseUrl)
  const title = dayforceJob.jobTitle ?? ''
  const location = buildLocation(dayforceJob)
  const jobUrl = dayforceJob.jobDetailsUrl
    ? new URL(dayforceJob.jobDetailsUrl, origin).toString()
    : `${origin}/${cultureCode}/${clientNamespace}/${jobBoardCode}/jobs/${dayforceJob.jobPostingId}`
  const jobDescription = dayforceJob.jobDescription
    ? stripHtml(dayforceJob.jobDescription)
    : null

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: dayforceJob.postingStartTimestampUTC ?? null,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedDayforceJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateDayforceJobHash(jobWithoutHash),
  }
}

export async function crawlDayforceCompany(
  config: DayforceCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? RECENT_JOB_MAX_AGE_DAYS
  const jobs = await fetchDayforceJobs(config)
  const recentJobs = jobs.filter((job) =>
    isJobRecent(job.postingStartTimestampUTC, maxAgeDays),
  )

  return recentJobs.map((job) => normalizeJob(config, job))
}
