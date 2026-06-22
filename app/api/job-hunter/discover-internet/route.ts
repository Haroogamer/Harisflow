import { NextResponse } from 'next/server'
import { searchServiceNowJobUrls } from '@/lib/job-hunter/discovery-providers/search'
import { intakeJobSourceUrls } from '@/lib/job-hunter/source-intake'

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
  const result = await intakeJobSourceUrls(urls)

  return NextResponse.json({
    urlsFound: urls.length,
    sourcesInserted: result.sourcesInserted,
    sourcesSkipped: result.sourcesSkipped,
    jobsDiscovered: result.jobsDiscovered,
    jobsMatched: result.jobsMatched,
    jobsInserted: result.jobsInserted,
    jobsSkipped: result.jobsSkipped,
    ignoredNonMatching: result.ignoredNonMatching,
    notificationsSent: result.notificationsSent,
    notificationFailures: result.notificationFailures,
    errors: result.errors,
  })
}
