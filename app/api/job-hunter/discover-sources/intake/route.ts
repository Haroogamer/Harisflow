import { NextResponse } from 'next/server'
import { intakeJobSourceUrls } from '@/lib/job-hunter/source-intake'

type IntakeRequestBody = {
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

  let body: IntakeRequestBody

  try {
    body = (await request.json()) as IntakeRequestBody
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

  const result = await intakeJobSourceUrls(body.urls)

  return NextResponse.json(result)
}
