import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

const ATS_PLATFORM = 'icims'
const ICIMS_HOST_PATTERN = /^[a-z0-9-]+\.icims\.com$/i

export type IcimsCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'icims'
}

type NormalizedIcimsJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type IcimsJobItem = {
  id?: number | string
  title?: string
  location_name?: string
  city?: string
  state?: string
  country?: string
  date_apply_start?: string
  postingDate?: string
  joblisting?: string
  link?: string
}

type IcimsSearchResponse = {
  totalCount?: number
  searchResults?: IcimsJobItem[]
  jobs?: IcimsJobItem[]
}

function getTenantFromUrl(baseUrl: string) {
  const url = new URL(baseUrl)
  const hostname = url.hostname.toLowerCase()

  if (!ICIMS_HOST_PATTERN.test(hostname)) {
    throw new Error(`Invalid iCIMS careers URL: ${baseUrl}`)
  }

  return hostname
}

function generateIcimsJobHash(
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

function buildLocation(item: IcimsJobItem) {
  if (item.location_name) return item.location_name

  const parts = [item.city, item.state, item.country].filter(Boolean)

  return parts.join(', ') || 'Not specified'
}

function buildJobUrl(tenant: string, item: IcimsJobItem) {
  if (item.link) return item.link
  if (item.joblisting) return item.joblisting

  const jobId = item.id

  if (jobId) {
    return `https://${tenant}/jobs/${String(jobId)}/job`
  }

  return `https://${tenant}/jobs/search`
}

function getDatePosted(item: IcimsJobItem) {
  return item.date_apply_start ?? item.postingDate ?? null
}

async function fetchIcimsJobs(baseUrl: string) {
  const tenant = getTenantFromUrl(baseUrl)
  const searchParams = new URLSearchParams({
    ss: '1',
    in_iframe: '1',
    searchKeyword: 'ServiceNow',
    mobile: 'false',
    width: '1000',
    height: '500',
    bga: 'true',
  })
  const response = await fetch(
    `https://${tenant}/jobs/search?${searchParams}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch iCIMS jobs: ${response.status} ${errorBody}`,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    // iCIMS returned HTML instead of JSON; this portal version is not supported
    console.warn(
      `[iCIMS] Portal returned non-JSON response (content-type: ${contentType}) for ${baseUrl} — skipping`,
    )
    return []
  }

  const data = (await response.json()) as IcimsSearchResponse
  const items = data.searchResults ?? data.jobs ?? []

  return Array.isArray(items) ? items : []
}

function normalizeJob(config: IcimsCompanyConfig, item: IcimsJobItem) {
  const tenant = getTenantFromUrl(config.baseUrl)
  const title = item.title ?? ''
  const location = buildLocation(item)
  const jobUrl = buildJobUrl(tenant, item)
  const datePosted = getDatePosted(item)

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: datePosted,
    status: 'new',
    job_description: null,
  } satisfies Omit<NormalizedIcimsJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateIcimsJobHash(jobWithoutHash),
  }
}

export async function crawlIcimsCompany(
  config: IcimsCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? RECENT_JOB_MAX_AGE_DAYS
  const items = await fetchIcimsJobs(config.baseUrl)

  const recentItems = items.filter((item) =>
    isJobRecent(getDatePosted(item), maxAgeDays),
  )

  return recentItems.map((item) => normalizeJob(config, item))
}
