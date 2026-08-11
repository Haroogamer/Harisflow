import { NextResponse } from 'next/server'
import {
  getLatestInternetAtsJobUrls,
} from '@/lib/job-hunter/discovery-providers/search'
import { intakeJobSourceUrls } from '@/lib/job-hunter/source-intake'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let internetUrls: string[] = []
  let diagnostics: Awaited<ReturnType<typeof getLatestInternetAtsJobUrls>>['diagnostics'] = {
    serpResultsReceived: 0,
    resultsWithUrl: 0,
    resultsWithPostedAt: 0,
    resultsRejectedByDate: 0,
    resultsRejectedUnsupportedAts: 0,
    supportedAtsUrlsFound: 0,
    urlsReturned: 0,
    atsCounts: {},
    aggregatorResults: 0,
    resultsWithApplyOptions: 0,
    directAtsLinksResolved: 0,
    unresolvedAggregatorResults: 0,
    rejectedSamples: [],
    resolvedSamples: [],
  }
  let discoveryError: string | undefined

  try {
    const internetUrlsResult = await getLatestInternetAtsJobUrls({
      maxSources: MAX_PROCESSED_SOURCES,
    })
    internetUrls = internetUrlsResult.urls
    diagnostics = internetUrlsResult.diagnostics
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    discoveryError = message.startsWith('Missing SERPAPI_API_KEY')
      ? 'Missing SERPAPI_API_KEY'
      : message
  }

  const result = await intakeJobSourceUrls(internetUrls, {
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
    ...(discoveryError !== undefined && { discoveryError }),
    urlsFound: internetUrls.length,
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
    serpResultsReceived: diagnostics.serpResultsReceived,
    resultsWithUrl: diagnostics.resultsWithUrl,
    resultsWithPostedAt: diagnostics.resultsWithPostedAt,
    resultsRejectedByDate: diagnostics.resultsRejectedByDate,
    resultsRejectedUnsupportedAts: diagnostics.resultsRejectedUnsupportedAts,
    supportedAtsUrlsFound: diagnostics.supportedAtsUrlsFound,
    urlsReturned: diagnostics.urlsReturned,
    atsCounts: diagnostics.atsCounts,
    rejectedSamples: diagnostics.rejectedSamples,
    sourceResults,
    errorSummary: buildErrorSummary(result.errors),
    errors: result.errors,
  })
}
