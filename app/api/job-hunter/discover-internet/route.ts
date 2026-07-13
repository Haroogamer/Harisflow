import { NextResponse } from 'next/server'
import {
  getLatestInternetAtsJobUrls,
} from '@/lib/job-hunter/discovery-providers/search'
import { intakeJobSourceUrls } from '@/lib/job-hunter/source-intake'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'
import {
  analyzeJobSourceUrl,
  normalizeJobSourceCareersUrl,
} from '@/lib/job-hunter/source-analyzer'

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

const MAX_PROCESSED_SOURCES = 15
const SOURCE_CRAWL_DELAY_MS = 2_000
const DISCORD_NOTIFICATION_DELAY_MS = 750
const ERROR_EXAMPLE_LIMIT = 3
const MAX_AGE_DAYS = RECENT_JOB_MAX_AGE_DAYS

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

function getSourceDeduplicationKey(url: string) {
  try {
    const analyzed = analyzeJobSourceUrl(url)

    if (analyzed) {
      return normalizeJobSourceCareersUrl(analyzed.careers_url)
    }

    return normalizeJobSourceCareersUrl(url)
  } catch (error) {
    console.warn(`Failed to derive deduplication key for URL: ${url}`)
    console.warn(error)
    return url
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const internetUrls = await getLatestInternetAtsJobUrls({
    maxSources: MAX_PROCESSED_SOURCES,
  })

  const uniqueByKey = new Map<string, string>()

  for (const url of internetUrls) {
    const key = getSourceDeduplicationKey(url)

    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, url)
    }
  }

  const allDiscoveredUrls = Array.from(uniqueByKey.values())
  const urlsToProcess = allDiscoveredUrls
  const result = await intakeJobSourceUrls(urlsToProcess, {
    crawlDelayMs: SOURCE_CRAWL_DELAY_MS,
    notificationDelayMs: DISCORD_NOTIFICATION_DELAY_MS,
    maxAgeDays: MAX_AGE_DAYS,
  })

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
    internetUrlsFound: internetUrls.length,
    maxProcessedSources: MAX_PROCESSED_SOURCES,
    processedSources: result.sourcesAnalyzed,
    sourcesInserted: result.sourcesInserted,
    sourcesSkipped: result.sourcesSkipped,
    jobsDiscovered: result.jobsDiscovered,
    jobsMatched: result.jobsMatched,
    jobsInserted: result.jobsInserted,
    jobsSkipped: result.jobsSkipped,
    ignoredNonMatching: result.ignoredNonMatching,
    notificationsSent: result.notificationsSent,
    notificationFailures: result.notificationFailures,
    rateLimitedSources: result.rateLimitedSources,
    sourceResults,
    errorSummary: buildErrorSummary(result.errors),
    errors: result.errors,
  })
}
