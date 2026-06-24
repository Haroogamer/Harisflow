import { NextResponse } from 'next/server'
import { searchServiceNowJobUrls } from '@/lib/job-hunter/discovery-providers/search'
import { intakeJobSourceUrls } from '@/lib/job-hunter/source-intake'

const MAX_PROCESSED_SOURCES = 5
const SOURCE_CRAWL_DELAY_MS = 2_000
const DISCORD_NOTIFICATION_DELAY_MS = 750

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}`,
  )
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const urls = await searchServiceNowJobUrls()
  const urlsToProcess = urls.slice(0, MAX_PROCESSED_SOURCES)
  const result = await intakeJobSourceUrls(urlsToProcess, {
    crawlDelayMs: SOURCE_CRAWL_DELAY_MS,
    notificationDelayMs: DISCORD_NOTIFICATION_DELAY_MS,
  })

  return NextResponse.json({
    urlsFound: urls.length,
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
    errors: result.errors,
  })
}
