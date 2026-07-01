import { createHash } from 'crypto'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'
import { type CrawlOptions, isJobRecent } from '@/lib/job-hunter/crawlers/types'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

const ATS_PLATFORM = 'smartrecruiters'
const SMARTRECRUITERS_API_ORIGIN = 'https://api.smartrecruiters.com'
const PAGE_SIZE = 100

export type SmartRecruitersCompanyConfig = {
  company: string
  baseUrl: string
  ats_platform: 'smartrecruiters'
}

type NormalizedSmartRecruitersJob = Omit<JobHunterJob, 'id' | 'status'> & {
  status: 'new'
}

type SmartRecruitersLocation = {
  city?: string
  region?: string
  country?: string
  remote?: boolean
}

type SmartRecruitersPosting = {
  id?: string
  name?: string
  location?: SmartRecruitersLocation
  releasedDate?: string
  ref?: string
  jobAd?: {
    sections?: {
      jobDescription?: {
        text?: string
      }
    }
  }
}

type SmartRecruitersResponse = {
  totalFound?: number
  content?: SmartRecruitersPosting[]
}

function getCompanyId(baseUrl: string) {
  const url = new URL(baseUrl)
  const companyId = url.pathname.split('/').filter(Boolean)[0]

  if (!companyId) {
    throw new Error(`Invalid SmartRecruiters careers URL: ${baseUrl}`)
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(companyId)) {
    throw new Error(`Invalid SmartRecruiters company ID: ${companyId}`)
  }

  return companyId
}

function generateSmartRecruitersJobHash(
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

function buildLocation(location?: SmartRecruitersLocation) {
  if (!location) return 'Not specified'

  if (location.remote) return 'Remote'

  const parts = [location.city, location.region, location.country].filter(Boolean)

  return parts.join(', ') || 'Not specified'
}

async function fetchSmartRecruitersPostings(companyId: string) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: '0',
    q: 'ServiceNow',
    language: 'en',
  })
  const response = await fetch(
    `${SMARTRECRUITERS_API_ORIGIN}/v1/companies/${companyId}/postings?${params}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Failed to fetch SmartRecruiters jobs: ${response.status} ${errorBody}`,
    )
  }

  const data = (await response.json()) as SmartRecruitersResponse

  return data.content ?? []
}

function normalizeJob(
  config: SmartRecruitersCompanyConfig,
  posting: SmartRecruitersPosting,
) {
  const companyId = getCompanyId(config.baseUrl)
  const title = posting.name ?? ''
  const location = buildLocation(posting.location)
  const jobUrl =
    posting.ref ??
    (posting.id
      ? `https://careers.smartrecruiters.com/${companyId}/${posting.id}`
      : undefined)

  if (!jobUrl) return null
  const jobDescription =
    posting.jobAd?.sections?.jobDescription?.text?.trim() || null

  const jobWithoutHash = {
    company: config.company,
    ats_platform: ATS_PLATFORM,
    title,
    location,
    job_url: jobUrl,
    date_discovered: new Date().toISOString(),
    date_posted: posting.releasedDate ?? null,
    status: 'new',
    job_description: jobDescription,
  } satisfies Omit<NormalizedSmartRecruitersJob, 'job_hash'>

  return {
    ...jobWithoutHash,
    job_hash: generateSmartRecruitersJobHash(jobWithoutHash),
  }
}

export async function crawlSmartRecruitersCompany(
  config: SmartRecruitersCompanyConfig,
  options: CrawlOptions = {},
) {
  const maxAgeDays = options.maxAgeDays ?? RECENT_JOB_MAX_AGE_DAYS
  const companyId = getCompanyId(config.baseUrl)
  const postings = await fetchSmartRecruitersPostings(companyId)

  const recentPostings = postings.filter((posting) =>
    isJobRecent(posting.releasedDate, maxAgeDays),
  )

  return recentPostings
    .map((posting) => normalizeJob(config, posting))
    .filter((job) => job !== null)
}
