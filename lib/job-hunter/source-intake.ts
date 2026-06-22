import { crawlGreenhouseCompany } from '@/lib/job-hunter/crawlers/greenhouse'
import { crawlWorkdayCompany } from '@/lib/job-hunter/crawlers/workday'
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
  | Awaited<ReturnType<typeof crawlWorkdayCompany>>[number]
  | Awaited<ReturnType<typeof crawlGreenhouseCompany>>[number]
>

export type SourceIntakeError = {
  url?: string
  source?: string
  job?: string
  error: string
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
  sourceResults: {
    original_url: string
    normalized_careers_url: string
    company: string
    sourceInserted: boolean
    sourceSkipped: boolean
    reason: string
  }[]
  errors: SourceIntakeError[]
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

async function crawlSource(source: JobSourceCandidate) {
  if (source.ats_platform === 'workday') {
    return crawlWorkdayCompany({
      company: source.company,
      baseUrl: source.careers_url,
    })
  }

  if (source.ats_platform === 'greenhouse') {
    return crawlGreenhouseCompany({
      company: source.company,
      baseUrl: source.careers_url,
      ats_platform: 'greenhouse',
    })
  }

  return []
}

export async function intakeJobSourceUrls(
  urls: string[],
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
    sourceResults: [],
    errors: [],
  }

  for (const url of urls) {
    result.sourcesAnalyzed += 1

    const source = analyzeJobSourceUrl(url)

    if (!source) {
      result.errors.push({
        url,
        error: 'Unsupported or invalid job source URL',
      })
      continue
    }

    let normalizedSource = source

    try {
      const saveResult = await saveSourceIfNew(source)
      normalizedSource = {
        ...source,
        careers_url: saveResult.normalizedCareersUrl,
      }

      result.sourceResults.push({
        original_url: source.original_url,
        normalized_careers_url: saveResult.normalizedCareersUrl,
        company: source.company,
        sourceInserted: saveResult.sourceInserted,
        sourceSkipped: saveResult.sourceSkipped,
        reason: saveResult.reason,
      })

      if (saveResult.sourceInserted) {
        result.sourcesInserted += 1
      } else {
        result.sourcesSkipped += 1
      }
    } catch (error) {
      result.errors.push({
        url,
        source: source.careers_url,
        error: serializeError(error),
      })
      continue
    }

    if (
      normalizedSource.ats_platform !== 'workday' &&
      normalizedSource.ats_platform !== 'greenhouse'
    ) {
      continue
    }

    try {
      const jobs = await crawlSource(normalizedSource)
      const validJobs = jobs.filter(
        (job): job is IntakeJob => job !== null && job !== undefined,
      )

      result.jobsDiscovered += jobs.length

      for (const job of validJobs) {
        const title = job.title || 'Untitled job'
        const match = explainJobMatch(job)

        if (!match.matches) {
          result.ignoredNonMatching += 1
          continue
        }

        result.jobsMatched += 1

        try {
          const jobHash = await generateJobHash(job)
          const exists = await jobExists(jobHash)

          if (exists) {
            result.jobsSkipped += 1
            continue
          }

          const savedJob = await saveJob({ ...job, job_hash: jobHash })
          result.jobsInserted += 1

          const notificationResult = await sendDiscordNotification(savedJob)

          if (notificationResult.sent) {
            result.notificationsSent += 1
          } else {
            result.notificationFailures += 1
            result.errors.push({
              source: normalizedSource.careers_url,
              job: title,
              error: `Discord notification failed: ${notificationResult.reason}`,
            })
          }
        } catch (error) {
          result.errors.push({
            source: normalizedSource.careers_url,
            job: title,
            error: serializeError(error),
          })
        }
      }
    } catch (error) {
      result.errors.push({
        url,
        source: normalizedSource.careers_url,
        error: serializeError(error),
      })
    }
  }

  return result
}
