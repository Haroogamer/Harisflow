import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'

const ATS_PLATFORM = 'ashby'
const ASHBY_API_ORIGIN = 'https://api.ashbyhq.com'

export type AshbyCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'ashby'
}

type NormalizedAshbyJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type AshbyJobPosting = {
  id?: string
  title?: string
  isListed?: boolean
  locationName?: string
  teamName?: string
  jobUrl?: string
  publishedDate?: string
  descriptionHtml?: string
}

type AshbyJobBoardResponse = {
  jobPostings?: AshbyJobPosting[]
}

function getBoardHandle(baseUrl: string) {
  const url = new URL(baseUrl)
  const handle = url.pathname.split('/').filter(Boolean)[0]

  if (!handle) {
    throw new Error(`Invalid Ashby board URL: ${baseUrl}`)
  }

  return handle
}

function generateAshbyJobHash(
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

async function fetchAshbyJobs(boardHandle: string) {
  const response = await fetch(
    `${ASHBY_API_ORIGIN}/posting-api/job-board`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ boardHandle }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Ashby jobs: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as AshbyJobBoardResponse

  return (data.jobPostings ?? []).filter((job) => job.isListed !== false)
}

function normalizeJob(
  config: AshbyCompanyConfig,
  ashbyJob: AshbyJobPosting,
) {
  const title = ashbyJob.title ?? ''
  const location = ashbyJob.locationName || 'Not specified'
  const jobUrl =
    ashbyJob.jobUrl ??
    `https://jobs.ashbyhq.com/${getBoardHandle(config.baseUrl)}/${ashbyJob.id}`
  const jobDescription = ashbyJob.descriptionHtml
    ? stripHtml(ashbyJob.descriptionHtml)
    : null

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: ashbyJob.publishedDate ?? null,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedAshbyJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateAshbyJobHash(jobWithoutHash),
  }
}

export async function crawlAshbyCompany(
  config: AshbyCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? 14
  const boardHandle = getBoardHandle(config.baseUrl)
  const jobs = await fetchAshbyJobs(boardHandle)

  const recentJobs = jobs.filter((job) =>
    isJobRecent(job.publishedDate, maxAgeDays),
  )

  return recentJobs.map((job) => normalizeJob(config, job))
}
