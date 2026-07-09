import { NextResponse } from 'next/server'
import { crawlJobsForSource } from '@/lib/job-hunter/crawlers/registry'
import { delay } from '@/lib/job-hunter/delay'
import {
  DISCOVERY_SOURCES,
} from '@/lib/job-hunter/discovery-sources'
import { sendDiscordNotification } from '@/lib/job-hunter/discord'
import { explainJobMatch } from '@/lib/job-hunter/keywords'
import {
  generateJobHash,
  jobExists,
  saveJob,
} from '@/lib/job-hunter/job-storage'

type DiscoveredJob = NonNullable<Awaited<ReturnType<typeof crawlJobsForSource>>[number]>

type DiscoveryError = { title: string; error: string }

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
  company: string
  baseUrl: string
  atsPlatform: string
  status: 'success' | 'error'
  discovered: number
  matched: number
  inserted: number
  skipped: number
  ignoredNonMatching: number
  failed: number
  notificationFailures: number
  errors: DiscoveryError[]
}

const SAMPLE_LIMIT = 10
const MAX_DISCOVERY_SOURCES = 10
const SOURCE_CRAWL_DELAY_MS = 2_000
const DISCORD_NOTIFICATION_DELAY_MS = 750

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

async function crawlDiscoverySource(source: (typeof DISCOVERY_SOURCES)[number]) {
  return crawlJobsForSource(source)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let discovered = 0
  let matched = 0
  let inserted = 0
  let skipped = 0
  let ignoredNonMatching = 0
  let failed = 0
  let notificationFailures = 0
  let processedSources = 0
  let notificationAttempts = 0
  const sourceResults: SourceResult[] = []
  const matchedSamples: MatchedSample[] = []
  const ignoredSamples: IgnoredSample[] = []

  for (const source of DISCOVERY_SOURCES.slice(0, MAX_DISCOVERY_SOURCES)) {
    const sourceErrors: DiscoveryError[] = []
    let sourceDiscovered = 0
    let sourceMatched = 0
    let sourceInserted = 0
    let sourceSkipped = 0
    let sourceIgnoredNonMatching = 0
    let sourceFailed = 0
    let sourceNotificationFailures = 0

    try {
      // Skip the initial delay so the first source starts immediately.
      if (processedSources > 0) {
        await delay(SOURCE_CRAWL_DELAY_MS)
      }

      processedSources += 1

      const jobs = await crawlDiscoverySource(source)
      const validJobs = jobs.filter(
        (job): job is DiscoveredJob => job !== null && job !== undefined,
      )

      sourceDiscovered = jobs.length

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

        try {
          const jobHash = await generateJobHash(job)
          const exists = await jobExists(jobHash)

          if (exists) {
            sourceSkipped += 1
            continue
          }

          const savedJob = await saveJob({ ...job, job_hash: jobHash })
          sourceInserted += 1

          // Skip the initial delay so the first notification can be sent immediately.
          if (notificationAttempts > 0) {
            await delay(DISCORD_NOTIFICATION_DELAY_MS)
          }

          notificationAttempts += 1

          const notificationResult = await sendDiscordNotification(savedJob)

          if (!notificationResult.sent) {
            sourceNotificationFailures += 1
            sourceErrors.push({
              title,
              error: `Discord notification failed: ${notificationResult.reason}`,
            })
          }
        } catch (error) {
          sourceFailed += 1
          sourceErrors.push({ title, error: serializeError(error) })
          console.error(`Failed to process discovered job: ${title}`)
          console.error(error)
        }
      }

      sourceResults.push({
        company: source.company,
        baseUrl: source.baseUrl,
        atsPlatform: source.ats_platform,
        status: 'success',
        discovered: sourceDiscovered,
        matched: sourceMatched,
        inserted: sourceInserted,
        skipped: sourceSkipped,
        ignoredNonMatching: sourceIgnoredNonMatching,
        failed: sourceFailed,
        notificationFailures: sourceNotificationFailures,
        errors: sourceErrors,
      })
    } catch (error) {
      sourceFailed += 1
      sourceErrors.push({
        title: source.company,
        error: serializeError(error),
      })
      console.error(`Failed to discover jobs for source: ${source.company}`)
      console.error(error)

      sourceResults.push({
        company: source.company,
        baseUrl: source.baseUrl,
        atsPlatform: source.ats_platform,
        status: 'error',
        discovered: sourceDiscovered,
        matched: sourceMatched,
        inserted: sourceInserted,
        skipped: sourceSkipped,
        ignoredNonMatching: sourceIgnoredNonMatching,
        failed: sourceFailed,
        notificationFailures: sourceNotificationFailures,
        errors: sourceErrors,
      })
    }

    discovered += sourceDiscovered
    matched += sourceMatched
    inserted += sourceInserted
    skipped += sourceSkipped
    ignoredNonMatching += sourceIgnoredNonMatching
    failed += sourceFailed
    notificationFailures += sourceNotificationFailures
  }

  return NextResponse.json({
    discovered,
    matched,
    inserted,
    skipped,
    ignoredNonMatching,
    failed,
    notificationFailures,
    maxSources: MAX_DISCOVERY_SOURCES,
    processedSources,
    sourceResults,
    matchedSamples,
    ignoredSamples,
  })
}
