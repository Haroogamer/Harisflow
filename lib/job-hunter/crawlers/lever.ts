import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'

const ATS_PLATFORM = 'lever'
const LEVER_API_ORIGIN = 'https://api.lever.co'

export type LeverCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'lever'
}

type NormalizedLeverJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type LeverCategories = {
  location?: string
  team?: string
  commitment?: string
}

type LeverJob = {
  id?: string
  text?: string
  categories?: LeverCategories
  hostedUrl?: string
  createdAt?: number
  descriptionPlain?: string
}

function getCompanySlug(baseUrl: string) {
  const url = new URL(baseUrl)
  const slug = url.pathname.split('/').filter(Boolean)[0]

  if (!slug) {
    throw new Error(`Invalid Lever board URL: ${baseUrl}`)
  }

  // Validate slug is safe to embed in a URL path segment
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw new Error(`Invalid Lever company slug: ${slug}`)
  }

  return slug
}

function generateLeverJobHash(
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

function getLocation(leverJob: LeverJob) {
  return leverJob.categories?.location || 'Not specified'
}

function getDatePosted(leverJob: LeverJob) {
  if (!leverJob.createdAt) return null

  return new Date(leverJob.createdAt).toISOString()
}

async function fetchLeverJobs(companySlug: string) {
  const response = await fetch(
    `${LEVER_API_ORIGIN}/v0/postings/${companySlug}?mode=json`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Lever jobs: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as LeverJob[]

  return Array.isArray(data) ? data : []
}

function normalizeJob(
  config: LeverCompanyConfig,
  leverJob: LeverJob,
) {
  const title = leverJob.text ?? ''
  const location = getLocation(leverJob)
  const jobUrl =
    leverJob.hostedUrl ??
    `${config.baseUrl.replace(/\/$/, '')}/${leverJob.id}`
  const jobDescription = leverJob.descriptionPlain?.trim() || null
  const datePosted = getDatePosted(leverJob)

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
  } satisfies Omit<NormalizedLeverJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateLeverJobHash(jobWithoutHash),
  }
}

export async function crawlLeverCompany(
  config: LeverCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? 14
  const companySlug = getCompanySlug(config.baseUrl)
  const jobs = await fetchLeverJobs(companySlug)

  const recentJobs = jobs.filter((job) =>
    isJobRecent(job.createdAt, maxAgeDays),
  )

  return recentJobs.map((job) => normalizeJob(config, job))
}
