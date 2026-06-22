import { NextResponse } from 'next/server'
import { discoverFromManualUrls } from '@/lib/job-hunter/discovery-providers/manual'

type DiscoverSourcesRequestBody = {
  urls?: unknown
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}`,
  )
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: DiscoverSourcesRequestBody

  try {
    body = (await request.json()) as DiscoverSourcesRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    !Array.isArray(body.urls) ||
    !body.urls.every((url) => typeof url === 'string')
  ) {
    return NextResponse.json(
      { error: 'Expected JSON body with urls: string[]' },
      { status: 400 },
    )
  }

  const candidates = discoverFromManualUrls(body.urls)

  return NextResponse.json({
    candidates,
  })
}
