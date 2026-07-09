import { NextResponse } from 'next/server'
import {
  crawlJobsForSource,
  isSupportedAtsPlatform,
} from '@/lib/job-hunter/crawlers/registry'
import {
  generateJobHash,
  jobsExistByHash,
  saveJob,
} from '@/lib/job-hunter/job-storage'
import { getEnabledJobSources } from '@/lib/job-hunter/job-sources'
import type { JobHunterJob, JobSource } from '@/lib/job-hunter/job-types'
import { explainJobMatch } from '@/lib/job-hunter/keywords'
import { sendDiscordNotification } from '@/lib/job-hunter/discord'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { RECENT_JOB_MAX_AGE_DAYS } from '@/lib/job-hunter/constants'

type CrawledJob = Awaited<ReturnType<typeof crawlJobsForSource>>[number]

type CrawlError = { title: string; error: string }

type IgnoredSample = {
  title: string
  company: string
  reason: string
}

type MatchedSample = {
  title: string
  company: string
  matchedTerms: string[]
  reason: string
}

type SourceResult = {
  sourceId: string
  company: string
  atsPlatform: string
  status: 'success' | 'error' | 'unsupported'
  discovered: number
  matched: number
  inserted: number
  skipped: number
  failed: number
  rateLimited: boolean
  notificationsSent: number
  notificationFailures: number
  ignoredInvalid: number
  ignoredNonMatching: number
  errors: CrawlError[]
}

type ErrorSummaryItem = {
  type: 'rate_limited' | 'error'
  message: string
  count: number
  examples: CrawlError[]
}

const SAMPLE_LIMIT = 10
const MAX_SOURCES_PER_RUN = 15
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

function isRateLimitErrorMessage(message: string) {
  return /(^|\D)429(\D|$)/.test(message)
}

function buildErrorSummary(errors: CrawlError[]) {
  const summaryByKey = new Map<string, ErrorSummaryItem>()

  for (const error of errors) {
    const type = error.error.includes('429') ? 'rate_limited' : 'error'
    const key = `${type}::${error.error}`
    const existing = summaryByKey.get(key)

    if (existing) {
      existing.count += 1

      if (existing.examples.length < ERROR_EXAMPLE_LIMIT) {
        existing.examples.push(error)
      }

      continue
    }

    summaryByKey.set(key, {
      type,
      message: error.error,
      count: 1,
      examples: [error],
    })
  }

  return Array.from(summaryByKey.values())
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function crawlJobSource(source: JobSource): Promise<CrawledJob[]> {
  if (!isSupportedAtsPlatform(source.ats_platform)) {
    return []
  }

  return crawlJobsForSource(
    {
      company: source.company,
      baseUrl: source.careers_url,
      ats_platform: source.ats_platform,
    },
    { maxAgeDays: MAX_AGE_DAYS },
  )
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

  const maxSources = MAX_SOURCES_PER_RUN
  const sources = await getEnabledJobSources()
  const sourcesToCrawl: JobSource[] = []
  let discovered = 0
  let inserted = 0
  let skipped = 0
  let skippedUnsupported = 0
  let failed = 0
  let notificationsSent = 0
  let notificationFailures = 0
  let ignoredNonMatching = 0
  let processedSources = 0
  let notificationAttempts = 0
  const errors: CrawlError[] = []
  const sourceResults: SourceResult[] = []
  const ignoredSamples: IgnoredSample[] = []
  const matchedSamples: MatchedSample[] = []
  const rateLimitedSources = new Set<string>()

  for (const source of sources) {
    if (!isSupportedAtsPlatform(source.ats_platform)) {
      skippedUnsupported += 1
      sourceResults.push({
        sourceId: source.id,
        company: source.company,
        atsPlatform: source.ats_platform,
        status: 'unsupported',
        discovered: 0,
        matched: 0,
        inserted: 0,
        skipped: 0,
        failed: 0,
        rateLimited: false,
        notificationsSent: 0,
        notificationFailures: 0,
        ignoredInvalid: 0,
        ignoredNonMatching: 0,
        errors: [],
      })
      continue
    }

    sourcesToCrawl.push(source)

    if (sourcesToCrawl.length === maxSources) {
      break
    }
  }

  for (const source of sourcesToCrawl) {
    const sourceErrors: CrawlError[] = []
    let sourceDiscovered = 0
    let sourceMatched = 0
    let sourceInserted = 0
    let sourceSkipped = 0
    let sourceFailed = 0
    let sourceRateLimited = false
    let sourceNotificationsSent = 0
    let sourceNotificationFailures = 0
    let sourceIgnoredInvalid = 0
    let sourceIgnoredNonMatching = 0

    if (rateLimitedSources.has(source.careers_url)) {
      const rateLimitSkipError = {
        title: source.company,
        error: 'Source returned 429 earlier in this run; skipping immediate retry',
      }

      sourceResults.push({
        sourceId: source.id,
        company: source.company,
        atsPlatform: source.ats_platform,
        status: 'error',
        discovered: 0,
        matched: 0,
        inserted: 0,
        skipped: 0,
        failed: 1,
        rateLimited: true,
        notificationsSent: 0,
        notificationFailures: 0,
        ignoredInvalid: 0,
        ignoredNonMatching: 0,
        errors: [rateLimitSkipError],
      })
      errors.push(rateLimitSkipError)
      failed += 1
      continue
    }

    try {
      if (processedSources > 0) {
        await delay(SOURCE_CRAWL_DELAY_MS)
      }

      processedSources += 1

      const crawledAt = new Date().toISOString()

      await updateJobSource(source.id, { last_crawled_at: crawledAt })

      const jobs = await crawlJobSource(source)
      const validJobs = jobs.filter(
        (job): job is CrawledJob => job !== null && job !== undefined,
      )

      sourceDiscovered = jobs.length
      sourceIgnoredInvalid = jobs.length - validJobs.length

      // Keyword filter and collect matched jobs
      const matchedJobs: { job: CrawledJob; title: string; company: string }[] = []

      for (const job of validJobs) {
        const title = job.title || 'Untitled job'
        const company = job.company || source.company
        const match = explainJobMatch(job)

        if (!match.matches) {
          sourceIgnoredNonMatching += 1

          if (ignoredSamples.length < SAMPLE_LIMIT) {
            ignoredSamples.push({
              title,
              company,
              reason: match.reason,
            })
          }

          continue
        }

        sourceMatched += 1

        if (matchedSamples.length < SAMPLE_LIMIT) {
          matchedSamples.push({
            title,
            company,
            matchedTerms: match.matchedTerms,
            reason: match.reason,
          })
        }

        matchedJobs.push({ job, title, company })
      }

      // Batch existence check for all matched jobs; zip with hash upfront to
      // keep job and hash together through the save/notify loop.
      const matchedJobsWithHash = await Promise.all(
        matchedJobs.map(async (entry) => ({
          ...entry,
          job_hash: await generateJobHash(entry.job),
        })),
      )
      const existingHashes = await jobsExistByHash(
        matchedJobsWithHash.map((e) => e.job_hash),
      )

      for (const { job, title, job_hash } of matchedJobsWithHash) {
        if (existingHashes.has(job_hash)) {
          sourceSkipped += 1
          continue
        }

        try {
          const savedJob = await saveJob({ ...job, job_hash })
          sourceInserted += 1

          if (notificationAttempts > 0) {
            await delay(DISCORD_NOTIFICATION_DELAY_MS)
          }

          notificationAttempts += 1

          const notificationResult = await sendDiscordNotification(savedJob)

          if (notificationResult.sent) {
            sourceNotificationsSent += 1
          } else {
            sourceNotificationFailures += 1
            sourceErrors.push({
              title,
              error: `Discord notification failed: ${notificationResult.reason}`,
            })

            console.error(
              `Failed to send Discord notification for crawled job: ${title}`,
            )
            console.error(notificationResult.reason)
          }
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
        matched: sourceMatched,
        inserted: sourceInserted,
        skipped: sourceSkipped,
        failed: sourceFailed,
        rateLimited: sourceRateLimited,
        notificationsSent: sourceNotificationsSent,
        notificationFailures: sourceNotificationFailures,
        ignoredInvalid: sourceIgnoredInvalid,
        ignoredNonMatching: sourceIgnoredNonMatching,
        errors: sourceErrors,
      })
    } catch (error) {
      sourceFailed += 1

      const errorMessage = serializeError(error)
      const isRateLimitError = isRateLimitErrorMessage(errorMessage)

      if (isRateLimitError) {
        rateLimitedSources.add(source.careers_url)
        sourceRateLimited = true
      }

      const sourceError = {
        title: source.company,
        error: isRateLimitError
          ? `Source returned 429; skipping immediate retry: ${errorMessage}`
          : errorMessage,
      }

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
        matched: sourceMatched,
        inserted: sourceInserted,
        skipped: sourceSkipped,
        failed: sourceFailed,
        rateLimited: sourceRateLimited,
        notificationsSent: sourceNotificationsSent,
        notificationFailures: sourceNotificationFailures,
        ignoredInvalid: sourceIgnoredInvalid,
        ignoredNonMatching: sourceIgnoredNonMatching,
        errors: sourceErrors,
      })
    }

    discovered += sourceDiscovered
    inserted += sourceInserted
    skipped += sourceSkipped
    failed += sourceFailed
    notificationsSent += sourceNotificationsSent
    notificationFailures += sourceNotificationFailures
    ignoredNonMatching += sourceIgnoredNonMatching
    errors.push(...sourceErrors)
  }

  return NextResponse.json({
    discovered,
    inserted,
    skipped,
    skippedUnsupported,
    failed,
    notificationsSent,
    notificationFailures,
    maxSources,
    processedSources,
    rateLimitedSources: Array.from(rateLimitedSources),
    ignoredNonMatching,
    ignoredSamples,
    matchedSamples,
    sourceResults,
    errorSummary: buildErrorSummary(errors),
    errors,
  })
}
