import { NextResponse } from 'next/server'
import { crawlWorkdayGuidehouse } from '@/lib/job-hunter/crawlers/workday'
import {
  generateJobHash,
  jobExists,
  saveJob,
} from '@/lib/job-hunter/job-storage'
import { sendDiscordNotification } from '@/lib/job-hunter/discord'

type CrawledJob = NonNullable<
  Awaited<ReturnType<typeof crawlWorkdayGuidehouse>>[number]
>

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}`,
  )
}

function serializeError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await crawlWorkdayGuidehouse()
  const validJobs = jobs.filter(
    (job): job is CrawledJob => job !== null && job !== undefined,
  )
  let inserted = 0
  let skipped = 0
  let failed = 0
  const errors: Array<{ title: string; error: string }> = []

  for (const job of validJobs) {
    const title = job.title || 'Untitled job'

    try {
      const job_hash = await generateJobHash(job)
      const jobWithHash = { ...job, job_hash }
      const exists = await jobExists(job_hash)

      if (exists) {
        skipped += 1
        continue
      }

      await saveJob(jobWithHash)
      inserted += 1

      await sendDiscordNotification(
        `New job found: ${job.title} at ${job.company}\n${job.job_url}`,
      )
    } catch (error) {
      failed += 1

      const errorMessage = serializeError(error)

      errors.push({ title, error: errorMessage })
      console.error(`Failed to process crawled job: ${title}`)
      console.error(error)
    }
  }

  return NextResponse.json({
    discovered: jobs.length,
    inserted,
    skipped,
    failed,
    ignoredInvalid: jobs.length - validJobs.length,
    errors,
  })
}
