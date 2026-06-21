import { NextResponse } from 'next/server'
import { crawlWorkdayCompany } from '@/lib/job-hunter/crawlers/workday'
import {
  generateJobHash,
  jobExists,
  saveJob,
} from '@/lib/job-hunter/job-storage'
import { getEnabledJobSources } from '@/lib/job-hunter/job-sources'
import type { JobSource } from '@/lib/job-hunter/job-types'
import { sendDiscordNotification } from '@/lib/job-hunter/discord'
import { supabaseAdmin } from '@/lib/supabase-admin'

type CrawledJob = NonNullable<
  Awaited<ReturnType<typeof crawlWorkdayCompany>>[number]
>

type CrawlError = { title: string; error: string }

type SourceResult = {
  sourceId: string
  company: string
  atsPlatform: string
  status: 'success' | 'error' | 'unsupported'
  discovered: number
  inserted: number
  skipped: number
  failed: number
  ignoredInvalid: number
  errors: CrawlError[]
}

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

async function updateJobSource(
  sourceId: string,
  values: Partial<
    Pick<
      JobSource,
      | 'last_crawled_at'
      | 'last_success_at'
      | 'last_job_found_at'
      | 'source_status'
      | 'failure_count'
    >
  >,
) {
  const { error } = await supabaseAdmin
    .from('job_sources')
    .update(values)
    .eq('id', sourceId)

  if (error) {
    throw error
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sources = await getEnabledJobSources()
  let discovered = 0
  let inserted = 0
  let skipped = 0
  let failed = 0
  let ignoredInvalid = 0
  const errors: CrawlError[] = []
  const sourceResults: SourceResult[] = []

  for (const source of sources) {
    const sourceErrors: CrawlError[] = []
    let sourceDiscovered = 0
    let sourceInserted = 0
    let sourceSkipped = 0
    let sourceFailed = 0
    let sourceIgnoredInvalid = 0

    if (source.ats_platform !== 'workday') {
      sourceResults.push({
        sourceId: source.id,
        company: source.company,
        atsPlatform: source.ats_platform,
        status: 'unsupported',
        discovered: 0,
        inserted: 0,
        skipped: 0,
        failed: 0,
        ignoredInvalid: 0,
        errors: [],
      })
      continue
    }

    try {
      const crawledAt = new Date().toISOString()

      await updateJobSource(source.id, { last_crawled_at: crawledAt })

      const jobs = await crawlWorkdayCompany({
        company: source.company,
        baseUrl: source.careers_url,
      })
      const validJobs = jobs.filter(
        (job): job is CrawledJob => job !== null && job !== undefined,
      )

      sourceDiscovered = jobs.length
      sourceIgnoredInvalid = jobs.length - validJobs.length

      for (const job of validJobs) {
        const title = job.title || 'Untitled job'

        try {
          const job_hash = await generateJobHash(job)
          const jobWithHash = { ...job, job_hash }
          const exists = await jobExists(job_hash)

          if (exists) {
            sourceSkipped += 1
            continue
          }

          await saveJob(jobWithHash)
          sourceInserted += 1

          await sendDiscordNotification(
            `New job found: ${job.title} at ${job.company}\n${job.job_url}`,
          )
        } catch (error) {
          sourceFailed += 1

          const errorMessage = serializeError(error)

          sourceErrors.push({ title, error: errorMessage })
          console.error(`Failed to process crawled job: ${title}`)
          console.error(error)
        }
      }

      const successValues: Parameters<typeof updateJobSource>[1] = {
        last_success_at: new Date().toISOString(),
        failure_count: 0,
      }

      if (sourceInserted > 0) {
        successValues.last_job_found_at = new Date().toISOString()
      }

      await updateJobSource(source.id, successValues)

      sourceResults.push({
        sourceId: source.id,
        company: source.company,
        atsPlatform: source.ats_platform,
        status: 'success',
        discovered: sourceDiscovered,
        inserted: sourceInserted,
        skipped: sourceSkipped,
        failed: sourceFailed,
        ignoredInvalid: sourceIgnoredInvalid,
        errors: sourceErrors,
      })
    } catch (error) {
      sourceFailed += 1

      const errorMessage = serializeError(error)
      const sourceError = { title: source.company, error: errorMessage }

      sourceErrors.push(sourceError)
      console.error(`Failed to crawl job source: ${source.company}`)
      console.error(error)

      try {
        await updateJobSource(source.id, {
          failure_count: source.failure_count + 1,
          source_status: 'error',
        })
      } catch (updateError) {
        const updateErrorMessage = serializeError(updateError)
        const failureUpdateError = {
          title: source.company,
          error: `Failed to update source failure state: ${updateErrorMessage}`,
        }

        sourceErrors.push(failureUpdateError)
        console.error(`Failed to update job source failure state: ${source.company}`)
        console.error(updateError)
      }

      sourceResults.push({
        sourceId: source.id,
        company: source.company,
        atsPlatform: source.ats_platform,
        status: 'error',
        discovered: sourceDiscovered,
        inserted: sourceInserted,
        skipped: sourceSkipped,
        failed: sourceFailed,
        ignoredInvalid: sourceIgnoredInvalid,
        errors: sourceErrors,
      })
    }

    discovered += sourceDiscovered
    inserted += sourceInserted
    skipped += sourceSkipped
    failed += sourceFailed
    ignoredInvalid += sourceIgnoredInvalid
    errors.push(...sourceErrors)
  }

  return NextResponse.json({
    discovered,
    inserted,
    skipped,
    failed,
    ignoredInvalid,
    errors,
    sourceResults,
  })
}
