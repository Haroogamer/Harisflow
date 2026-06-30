import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

const ATS_PLATFORM = 'greenhouse'
const GREENHOUSE_API_ORIGIN = 'https://boards-api.greenhouse.io'

export type GreenhouseCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'greenhouse'
}

type NormalizedGreenhouseJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type GreenhouseOffice = {
  name?: string
}

type GreenhouseLocation = {
  name?: string
}

type GreenhouseJob = {
  id: number
  title?: string
  absolute_url?: string
  content?: string
  updated_at?: string
  first_published?: string
  location?: GreenhouseLocation
  offices?: GreenhouseOffice[]
}

type GreenhouseJobsResponse = {
  jobs?: GreenhouseJob[]
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

function getBoardToken(baseUrl: string) {
  const url = new URL(baseUrl)
  const boardToken = url.pathname.split('/').filter(Boolean)[0]

  if (!boardToken) {
    throw new Error(`Invalid Greenhouse board URL: ${baseUrl}`)
  }

  return boardToken
}

function generateGreenhouseJobHash(job: Pick<
  JobHunterJob,
  'ats_platform' | 'company' | 'title' | 'location' | 'job_url'
>) {
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

function getLocation(job: GreenhouseJob) {
  const officeLocations = (job.offices ?? [])
    .map((office) => office.name)
    .filter(Boolean)

  return [
    job.location?.name,
    ...officeLocations,
  ]
    .filter(Boolean)
    .join('; ') || 'Not specified'
}

async function fetchGreenhouseJobs(boardToken: string) {
  const response = await fetch(
    `${GREENHOUSE_API_ORIGIN}/v1/boards/${boardToken}/jobs?content=true`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Greenhouse jobs: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as GreenhouseJobsResponse

  return data.jobs ?? []
}

function normalizeJob(
  config: GreenhouseCompanyConfig,
  greenhouseJob: GreenhouseJob,
) {
  const title = greenhouseJob.title ?? ''
  const location = getLocation(greenhouseJob)
  const jobUrl =
    greenhouseJob.absolute_url ??
    `${config.baseUrl.replace(/\/$/, '')}/jobs/${greenhouseJob.id}`
  const jobDescription = greenhouseJob.content
    ? stripHtml(greenhouseJob.content)
    : null

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: greenhouseJob.first_published ?? greenhouseJob.updated_at ?? null,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedGreenhouseJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateGreenhouseJobHash(jobWithoutHash),
  }
}

export async function crawlGreenhouseCompany(
  config: GreenhouseCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? RECENT_JOB_MAX_AGE_DAYS
  const boardToken = getBoardToken(config.baseUrl)
  const jobs = await fetchGreenhouseJobs(boardToken)

  const recentJobs = jobs.filter((job) =>
    isJobRecent(job.first_published ?? job.updated_at, maxAgeDays),
  )

  return recentJobs.map((job) => normalizeJob(config, job))
}
