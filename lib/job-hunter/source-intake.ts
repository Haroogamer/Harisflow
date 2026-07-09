import { crawlJobsForSource } from '@/lib/job-hunter/crawlers/registry'
import { delay } from '@/lib/job-hunter/delay'
import { sendDiscordNotification } from '@/lib/job-hunter/discord'
import { explainJobMatch } from '@/lib/job-hunter/keywords'
import {
  generateJobHash,
  jobExists,
  saveJob,
} from '@/lib/job-hunter/job-storage'
import {
  analyzeJobSourceUrl,
  normalizeJobSourceCareersUrl,
  type JobSourceCandidate,
} from '@/lib/job-hunter/source-analyzer'
import { supabaseAdmin } from '@/lib/supabase-admin'

type IntakeJob = NonNullable<
  Awaited<ReturnType<typeof crawlJobsForSource>>[number]
>

export type SourceIntakeError = {
  url?: string
  source?: string
  job?: string
  type?: 'rate_limited' | 'error'
  error: string
}

export type SourceIntakeSourceResult = {
  company: string
  atsPlatform: string
  discovered: number
  matched: number
  inserted: number
  skipped: number
  ignoredNonMatching: number
  failed: number
  rateLimited: boolean
}

export type SourceIntakeResult = {
  sourcesAnalyzed: number
  sourcesInserted: number
  sourcesSkipped: number
  jobsDiscovered: number
  jobsMatched: number
  jobsInserted: number
  jobsSkipped: number
  ignoredNonMatching: number
  notificationsSent: number
  notificationFailures: number
  rateLimitedSources: string[]
  sourceResults: SourceIntakeSourceResult[]
  errors: SourceIntakeError[]
}

type SourceIntakeOptions = {
  crawlDelayMs?: number
  notificationDelayMs?: number
  maxAgeDays?: number
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

function buildSourceNotes(source: JobSourceCandidate) {
  return [
    source.notes,
    `Original URL: ${source.original_url}`,
    `Discovery confidence: ${source.confidence}`,
  ].join('\n')
}

async function saveSourceIfNew(source: JobSourceCandidate) {
  const normalizedCareersUrl = normalizeJobSourceCareersUrl(source.careers_url)
  const { data: existingSource, error: lookupError } = await supabaseAdmin
    .from('job_sources')
    .select('id')
    .eq('careers_url', normalizedCareersUrl)
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    throw lookupError
  }

    if (existingSource) {
    return {
      normalizedCareersUrl,
      sourceInserted: false,
      sourceSkipped: true,
      reason: 'Duplicate careers_url',
    }
  }

  const { error: insertError } = await supabaseAdmin
    .from('job_sources')
    .insert({
      company: source.company,
      ats_platform: source.ats_platform,
      careers_url: normalizedCareersUrl,
      enabled: true,
      source_status: 'active',
      crawl_interval_minutes: 30,
      failure_count: 0,
      notes: buildSourceNotes(source),
    })

  if (insertError) {
    throw insertError
  }

  return {
    normalizedCareersUrl,
    sourceInserted: true,
    sourceSkipped: false,
    reason: 'Inserted new source',
  }
}

export type MatchedJobSourceSyncResult =
  | { status: 'unsupported'; reason: string }
  | {
      status: 'inserted' | 'skipped'
      careersUrl: string
      reason: string
    }

export async function syncMatchedJobSource(
  jobUrl?: string | null,
): Promise<MatchedJobSourceSyncResult> {
  if (!jobUrl) {
    return { status: 'unsupported', reason: 'Missing job URL' }
  }

  const source = analyzeJobSourceUrl(jobUrl)

  if (!source) {
    return { status: 'unsupported', reason: 'Unsupported or invalid job URL' }
  }

  const saveResult = await saveSourceIfNew(source)

  return {
    status: saveResult.sourceInserted ? 'inserted' : 'skipped',
    careersUrl: saveResult.normalizedCareersUrl,
    reason: saveResult.reason,
  }
}

async function crawlSource(
  source: JobSourceCandidate,
  options: SourceIntakeOptions = {},
) {
  return crawlJobsForSource(
    {
      company: source.company,
      baseUrl: source.careers_url,
      ats_platform: source.ats_platform,
    },
    { maxAgeDays: options.maxAgeDays },
  )
}

export async function intakeJobSourceUrls(
  urls: string[],
  options: SourceIntakeOptions = {},
): Promise<SourceIntakeResult> {
  const result: SourceIntakeResult = {
    sourcesAnalyzed: 0,
    sourcesInserted: 0,
    sourcesSkipped: 0,
    jobsDiscovered: 0,
    jobsMatched: 0,
    jobsInserted: 0,
    jobsSkipped: 0,
    ignoredNonMatching: 0,
    notificationsSent: 0,
    notificationFailures: 0,
    rateLimitedSources: [],
    sourceResults: [],
    errors: [],
  }
  const rateLimitedSources = new Set<string>()
  let crawledSources = 0
  let notificationAttempts = 0

  for (const url of urls) {
    result.sourcesAnalyzed += 1

    const source = analyzeJobSourceUrl(url)

    if (!source) {
      result.errors.push({
        url,
        type: 'error',
        error: 'Unsupported or invalid job source URL',
      })
      continue
    }

    const sourceResult: SourceIntakeSourceResult = {
      company: source.company,
      atsPlatform: source.ats_platform,
      discovered: 0,
      matched: 0,
      inserted: 0,
      skipped: 0,
      ignoredNonMatching: 0,
      failed: 0,
      rateLimited: false,
    }

    result.sourceResults.push(sourceResult)

    let normalizedSource = source

    try {
      const saveResult = await saveSourceIfNew(source)
      normalizedSource = {
        ...source,
        careers_url: saveResult.normalizedCareersUrl,
      }

      if (saveResult.sourceInserted) {
        result.sourcesInserted += 1
      } else {
        result.sourcesSkipped += 1
      }
    } catch (error) {
      sourceResult.failed += 1

      result.errors.push({
        url,
        source: source.careers_url,
        type: 'error',
        error: serializeError(error),
      })
      continue
    }

    if (rateLimitedSources.has(normalizedSource.careers_url)) {
      sourceResult.rateLimited = true
      sourceResult.failed += 1

      result.errors.push({
        url,
        source: normalizedSource.careers_url,
        type: 'rate_limited',
        error: 'Source returned 429 earlier in this run; skipping immediate retry',
      })
      continue
    }

    try {
      if (options.crawlDelayMs && crawledSources > 0) {
        await delay(options.crawlDelayMs)
      }

      crawledSources += 1

      const jobs = await crawlSource(normalizedSource, options)
      const validJobs = jobs.filter(
        (job): job is IntakeJob => job !== null && job !== undefined,
      )

      result.jobsDiscovered += jobs.length
      sourceResult.discovered += jobs.length

      for (const job of validJobs) {
        const title = job.title || 'Untitled job'
        const match = explainJobMatch(job)

        if (!match.matches) {
          result.ignoredNonMatching += 1
          sourceResult.ignoredNonMatching += 1
          continue
        }

        result.jobsMatched += 1
        sourceResult.matched += 1

        try {
          try {
            await syncMatchedJobSource(job.job_url)
          } catch (error) {
            result.errors.push({
              source: normalizedSource.careers_url,
              job: title,
              type: 'error',
              error: `Failed to sync matched job source: ${serializeError(error)}`,
            })
          }

          const jobHash = await generateJobHash(job)
          const exists = await jobExists(jobHash)

          if (exists) {
            result.jobsSkipped += 1
            sourceResult.skipped += 1
            continue
          }

          const savedJob = await saveJob({ ...job, job_hash: jobHash })
          result.jobsInserted += 1
          sourceResult.inserted += 1

          if (options.notificationDelayMs && notificationAttempts > 0) {
            await delay(options.notificationDelayMs)
          }

          notificationAttempts += 1

          const notificationResult = await sendDiscordNotification(savedJob)

          if (notificationResult.sent) {
            result.notificationsSent += 1
          } else {
            result.notificationFailures += 1

            result.errors.push({
              source: normalizedSource.careers_url,
              job: title,
              type: 'error',
              error: `Discord notification failed: ${notificationResult.reason}`,
            })
          }
        } catch (error) {
          sourceResult.failed += 1

          result.errors.push({
            source: normalizedSource.careers_url,
            job: title,
            type: 'error',
            error: serializeError(error),
          })
        }
      }
    } catch (error) {
      const errorMessage = serializeError(error)
      const isRateLimited = isRateLimitErrorMessage(errorMessage)

      sourceResult.failed += 1

      if (isRateLimited) {
        rateLimitedSources.add(normalizedSource.careers_url)
        result.rateLimitedSources = Array.from(rateLimitedSources)
        sourceResult.rateLimited = true
      }

      result.errors.push({
        url,
        source: normalizedSource.careers_url,
        type: isRateLimited ? 'rate_limited' : 'error',
        error: isRateLimited
          ? `Source returned 429; skipping immediate retry: ${errorMessage}`
          : errorMessage,
      })
    }
  }

  result.rateLimitedSources = Array.from(rateLimitedSources)

  return result
}
