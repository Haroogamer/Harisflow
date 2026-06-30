import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import {
  jobMatchesKeywords,
  titleMightMatchKeywords,
  SERVICE_NOW_KEYWORDS,
} from '@/lib/job-hunter/keywords'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

const ATS_PLATFORM = 'workday'
const PAGE_SIZE = 20

export type WorkdayCompanyConfig = {
  company: string
  baseUrl: string
}

export const WORKDAY_COMPANIES: WorkdayCompanyConfig[] = [
  {
    company: 'Guidehouse',
    baseUrl: 'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
  },
]

type NormalizedWorkdayJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type WorkdaySearchJob = {
  title?: string
  externalPath?: string
  locationsText?: string
}

type WorkdaySearchResponse = {
  jobPostings?: WorkdaySearchJob[]
}

type WorkdayJobDetailResponse = {
  jobPostingInfo?: {
    title?: string
    jobDescription?: string
    location?: string
    additionalLocations?: string[]
    startDate?: string
    externalUrl?: string
  }
}

function getWorkdayApiBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl)
  const site = url.pathname.split('/').filter(Boolean).at(-1)
  const tenant = url.hostname.split('.wd')[0]

  if (!tenant || !site) {
    throw new Error(`Invalid Workday base URL: ${baseUrl}`)
  }

  return `${url.origin}/wday/cxs/${tenant}/${site}`
}

function generateWorkdayJobHash(job: Pick<
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

async function fetchWorkdayJobs(apiBaseUrl: string, searchText: string) {
  const response = await fetch(`${apiBaseUrl}/jobs`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appliedFacets: {},
      limit: PAGE_SIZE,
      offset: 0,
      searchText,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Workday jobs: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as WorkdaySearchResponse

  return data.jobPostings ?? []
}

async function fetchWorkdayJobDetail(apiBaseUrl: string, externalPath: string) {
  const response = await fetch(`${apiBaseUrl}${externalPath}`)

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch Workday job detail: ${response.status} ${errorBody}`,
    )
  }

  return (await response.json()) as WorkdayJobDetailResponse
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

function getLocation(searchJob: WorkdaySearchJob, detail: WorkdayJobDetailResponse) {
  const jobPostingInfo = detail.jobPostingInfo
  const locations = [
    jobPostingInfo?.location,
    ...(jobPostingInfo?.additionalLocations ?? []),
  ].filter(Boolean)

  return locations.join('; ') || searchJob.locationsText || 'Not specified'
}

function getJobUrl(
  config: WorkdayCompanyConfig,
  searchJob: WorkdaySearchJob,
  detail: WorkdayJobDetailResponse,
) {
  return (
    detail.jobPostingInfo?.externalUrl ??
    `${config.baseUrl}${searchJob.externalPath}`
  )
}

function normalizeJob(
  config: WorkdayCompanyConfig,
  searchJob: WorkdaySearchJob,
  detail: WorkdayJobDetailResponse,
) {
  const title = detail.jobPostingInfo?.title ?? searchJob.title ?? ''
  const jobDescription = detail.jobPostingInfo?.jobDescription
    ? stripHtml(detail.jobPostingInfo.jobDescription)
    : null
  const location = getLocation(searchJob, detail)
  const jobUrl = getJobUrl(config, searchJob, detail)

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: detail.jobPostingInfo?.startDate ?? null,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedWorkdayJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateWorkdayJobHash(jobWithoutHash),
  }
}

export async function crawlWorkdayCompany(
  config: WorkdayCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? RECENT_JOB_MAX_AGE_DAYS
  const apiBaseUrl = getWorkdayApiBaseUrl(config.baseUrl)
  const jobsByPath = new Map<string, WorkdaySearchJob>()

  for (const keyword of SERVICE_NOW_KEYWORDS) {
    const jobs = await fetchWorkdayJobs(apiBaseUrl, keyword)

    for (const job of jobs) {
      if (job.externalPath) {
        jobsByPath.set(job.externalPath, job)
      }
    }
  }

  // Pre-filter by title before making expensive per-job detail fetches
  const candidateJobs = Array.from(jobsByPath.values()).filter((job) =>
    titleMightMatchKeywords(job.title),
  )

  const normalizedJobs = await Promise.all(
    candidateJobs.map(async (job) => {
      if (!job.externalPath) {
        return null
      }

      try {
        const detail = await fetchWorkdayJobDetail(apiBaseUrl, job.externalPath)
        const normalizedJob = normalizeJob(config, job, detail)

        if (!isJobRecent(normalizedJob.date_posted, maxAgeDays)) {
          return null
        }

        return jobMatchesKeywords({
          title: normalizedJob.title,
          description: normalizedJob.job_description,
        })
          ? normalizedJob
          : null
      } catch (error) {
        console.warn(
          `Skipping Workday job detail fetch failure: ${job.externalPath}`,
        )
        console.warn(error)

        return null
      }
    }),
  )

  return normalizedJobs.filter((job): job is NormalizedWorkdayJob =>
    Boolean(job),
  )
}
