import { NextResponse } from 'next/server'
import { searchServiceNowJobUrls, searchGoogleJobsForServiceNow } from '@/lib/job-hunter/discovery-providers/search'
import { intakeJobSourceUrls } from '@/lib/job-hunter/source-intake'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'
import { analyzeJobSourceUrl } from '@/lib/job-hunter/source-analyzer'
import { explainJobMatch } from '@/lib/job-hunter/keywords'
import {
  generateJobHash,
  jobsExistByHash,
  saveJob,
} from '@/lib/job-hunter/job-storage'
import { sendDiscordNotification } from '@/lib/job-hunter/discord'

type ErrorSummaryItem = {
  type: 'rate_limited' | 'error'
  message: string
  count: number
  examples: {
    url?: string
    source?: string
    job?: string
    error: string
  }[]
}

type DirectJobCandidate = {
  company: string
  ats_platform: string
  title: string
  location: string
  job_url: string
  date_posted: string | null
  job_description: null
  status: 'new'
}

type DirectJobSaveResult = {
  directJobsFound: number
  directJobsInserted: number
  directJobsSkipped: number
  notificationsSent: number
  notificationFailures: number
}

const MAX_PROCESSED_SOURCES = 25
const SOURCE_CRAWL_DELAY_MS = 2_000
const DISCORD_NOTIFICATION_DELAY_MS = 750
const ERROR_EXAMPLE_LIMIT = 3
const MAX_AGE_DAYS = RECENT_JOB_MAX_AGE_DAYS
// Supports relative Google Jobs timestamps like "5 days ago" and "2+ weeks ago".
const RELATIVE_POSTED_AT_PATTERN =
  /(\d+)\+?\s+(minute|hour|day|week|month|year)s?\s+ago/
const AGGREGATOR_HOST_KEYWORDS = [
  'linkedin',
  'indeed',
  'glassdoor',
  'ziprecruiter',
  'simplyhired',
  'jobrapido',
  'jooble',
  'talent.com',
]

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}`,
  )
}

function classifyErrorType(message: string) {
  return message.includes('429') ? 'rate_limited' : 'error'
}

function buildErrorSummary(
  errors: Awaited<ReturnType<typeof intakeJobSourceUrls>>['errors'],
) {
  const summaryByKey = new Map<string, ErrorSummaryItem>()

  for (const error of errors) {
    const type = error.type ?? classifyErrorType(error.error)
    const key = `${type}::${error.error}`
    const existing = summaryByKey.get(key)

    if (existing) {
      existing.count += 1

      if (existing.examples.length < ERROR_EXAMPLE_LIMIT) {
        existing.examples.push({
          url: error.url,
          source: error.source,
          job: error.job,
          error: error.error,
        })
      }

      continue
    }

    summaryByKey.set(key, {
      type,
      message: error.error,
      count: 1,
      examples: [
        {
          url: error.url,
          source: error.source,
          job: error.job,
          error: error.error,
        },
      ],
    })
  }

  return Array.from(summaryByKey.values())
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function parseRelativePostedAt(value: string | null) {
  if (!value) {
    return null
  }

  const normalizedValue = value.trim().toLowerCase()

  if (!normalizedValue) {
    return null
  }

  const now = new Date()

  if (normalizedValue === 'today' || normalizedValue === 'just posted') {
    return now.toISOString()
  }

  if (normalizedValue === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString()
  }

  const match = normalizedValue.match(RELATIVE_POSTED_AT_PATTERN)

  if (!match) {
    return null
  }

  const amount = Number(match[1])
  const unit = match[2]
  const postedAt = new Date(now)

  switch (unit) {
    case 'minute':
      postedAt.setMinutes(postedAt.getMinutes() - amount)
      break
    case 'hour':
      postedAt.setHours(postedAt.getHours() - amount)
      break
    case 'day':
      postedAt.setDate(postedAt.getDate() - amount)
      break
    case 'week':
      postedAt.setDate(postedAt.getDate() - (amount * 7))
      break
    case 'month':
      postedAt.setMonth(postedAt.getMonth() - amount)
      break
    case 'year':
      postedAt.setFullYear(postedAt.getFullYear() - amount)
      break
    default:
      return null
  }

  return postedAt.toISOString()
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isAggregatorUrl(value: string) {
  const hostname = getHostname(value)

  return AGGREGATOR_HOST_KEYWORDS.some((keyword) => hostname.includes(keyword))
}

function pickDirectJobUrl(links: string[]) {
  return links.find((link) => !isAggregatorUrl(link)) ?? links[0] ?? null
}

function formatDirectAtsPlatform(jobUrl: string) {
  return getHostname(jobUrl).replace(/^www\./, '') || 'direct'
}

function buildDirectJobCandidates(
  googleJobsResults: Awaited<ReturnType<typeof searchGoogleJobsForServiceNow>>,
) {
  const supportedSourceUrls = new Set<string>()
  const directJobsByUrl = new Map<string, DirectJobCandidate>()

  for (const result of googleJobsResults) {
    const supportedApplyUrls: string[] = []
    const unsupportedApplyUrls: string[] = []

    for (const applyOption of result.applyOptions) {
      if (analyzeJobSourceUrl(applyOption.link)) {
        supportedApplyUrls.push(applyOption.link)
      } else {
        unsupportedApplyUrls.push(applyOption.link)
      }
    }

    for (const supportedApplyUrl of supportedApplyUrls) {
      supportedSourceUrls.add(supportedApplyUrl)
    }

    if (supportedApplyUrls.length > 0) {
      continue
    }

    const directJobUrl = pickDirectJobUrl(unsupportedApplyUrls)

    if (!directJobUrl) {
      continue
    }

    const match = explainJobMatch({
      title: result.title,
      location: result.workFromHome ? `${result.location} Remote` : result.location,
    })

    if (!match.matches) {
      continue
    }

    directJobsByUrl.set(directJobUrl, {
      company: result.company,
      ats_platform: formatDirectAtsPlatform(directJobUrl),
      title: result.title,
      location: result.workFromHome ? `${result.location} Remote` : result.location,
      job_url: directJobUrl,
      date_posted: parseRelativePostedAt(result.postedAt),
      job_description: null,
      status: 'new',
    })
  }

  return {
    supportedSourceUrls: Array.from(supportedSourceUrls),
    directJobs: Array.from(directJobsByUrl.values()),
  }
}

async function saveDirectJobs(
  directJobs: DirectJobCandidate[],
): Promise<DirectJobSaveResult> {
  if (directJobs.length === 0) {
    return {
      directJobsFound: 0,
      directJobsInserted: 0,
      directJobsSkipped: 0,
      notificationsSent: 0,
      notificationFailures: 0,
    }
  }

  const directJobsWithHash = await Promise.all(
    directJobs.map(async (job) => ({
      ...job,
      job_hash: await generateJobHash(job),
    })),
  )
  const existingHashes = await jobsExistByHash(
    directJobsWithHash.map((job) => job.job_hash),
  )
  let directJobsInserted = 0
  let directJobsSkipped = 0
  let notificationsSent = 0
  let notificationFailures = 0
  let notificationAttempts = 0

  for (const directJob of directJobsWithHash) {
    if (existingHashes.has(directJob.job_hash)) {
      directJobsSkipped += 1
      continue
    }

    const savedJob = await saveJob(directJob)
    directJobsInserted += 1

    if (notificationAttempts > 0) {
      await delay(DISCORD_NOTIFICATION_DELAY_MS)
    }

    notificationAttempts += 1

    const notificationResult = await sendDiscordNotification(savedJob)

    if (notificationResult.sent) {
      notificationsSent += 1
    } else {
      notificationFailures += 1
    }
  }

  return {
    directJobsFound: directJobs.length,
    directJobsInserted,
    directJobsSkipped,
    notificationsSent,
    notificationFailures,
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [siteSearchUrls, googleJobsResults] = await Promise.all([
    searchServiceNowJobUrls(),
    searchGoogleJobsForServiceNow(),
  ])
  const {
    supportedSourceUrls: googleJobsSupportedSourceUrls,
    directJobs,
  } = buildDirectJobCandidates(googleJobsResults)

  const allDiscoveredUrls = Array.from(
    new Set([...siteSearchUrls, ...googleJobsSupportedSourceUrls]),
  )
  const urlsToProcess = allDiscoveredUrls.slice(0, MAX_PROCESSED_SOURCES)
  const result = await intakeJobSourceUrls(urlsToProcess, {
    crawlDelayMs: SOURCE_CRAWL_DELAY_MS,
    notificationDelayMs: DISCORD_NOTIFICATION_DELAY_MS,
    maxAgeDays: MAX_AGE_DAYS,
  })
  const directJobSaveResult = await saveDirectJobs(directJobs)

  const sourceResults = result.sourceResults.map((sourceResult) => ({
    company: sourceResult.company,
    atsPlatform: sourceResult.atsPlatform,
    discovered: sourceResult.discovered,
    matched: sourceResult.matched,
    inserted: sourceResult.inserted,
    skipped: sourceResult.skipped,
    ignoredNonMatching: sourceResult.ignoredNonMatching,
    failed: sourceResult.failed,
    rateLimited: sourceResult.rateLimited,
  }))

  return NextResponse.json({
    urlsFound: allDiscoveredUrls.length,
    siteSearchUrlsFound: siteSearchUrls.length,
    googleJobsResultsFound: googleJobsResults.length,
    googleJobsSupportedSourceUrlsFound: googleJobsSupportedSourceUrls.length,
    maxProcessedSources: MAX_PROCESSED_SOURCES,
    processedSources: result.sourcesAnalyzed,
    sourcesInserted: result.sourcesInserted,
    sourcesSkipped: result.sourcesSkipped,
    jobsDiscovered: result.jobsDiscovered,
    jobsMatched: result.jobsMatched,
    jobsInserted: result.jobsInserted,
    jobsSkipped: result.jobsSkipped,
    directJobsFound: directJobSaveResult.directJobsFound,
    directJobsInserted: directJobSaveResult.directJobsInserted,
    directJobsSkipped: directJobSaveResult.directJobsSkipped,
    ignoredNonMatching: result.ignoredNonMatching,
    notificationsSent:
      result.notificationsSent + directJobSaveResult.notificationsSent,
    notificationFailures:
      result.notificationFailures + directJobSaveResult.notificationFailures,
    rateLimitedSources: result.rateLimitedSources,
    sourceResults,
    errorSummary: buildErrorSummary(result.errors),
    errors: result.errors,
  })
}
