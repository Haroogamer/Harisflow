import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'

export type NewJobHunterJob = Omit<JobHunterJob, 'id'>

type JobHashInput = Pick<
  JobHunterJob,
  'ats_platform' | 'company' | 'title' | 'location' | 'job_url'
>

type SaveJobInput = Pick<
  JobHunterJob,
  | 'company'
  | 'ats_platform'
  | 'title'
  | 'location'
  | 'job_url'
  | 'date_posted'
  | 'job_description'
  | 'status'
> & {
  job_hash?: string
}

export async function generateJobHash(job: JobHashInput) {
  return createHash('sha256')
    .update(
      [
        job.ats_platform,
        job.company,
        job.title,
        job.location,
        job.job_url,
      ].join(':'),
    )
    .digest('hex')
}

export async function jobExists(jobHash: string) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('id')
    .eq('job_hash', jobHash)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function jobsExistByHash(hashes: string[]): Promise<Set<string>> {
  if (hashes.length === 0) return new Set()

  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('job_hash')
    .in('job_hash', hashes)

  if (error) {
    throw error
  }

  return new Set((data ?? []).map((row) => row.job_hash as string))
}

export async function saveJob(job: SaveJobInput) {
  const jobHash = job.job_hash ?? (await generateJobHash(job))

  const normalizedJob = {
    company: job.company,
    ats_platform: job.ats_platform,
    title: job.title,
    location: job.location,
    job_url: job.job_url,
    job_hash: jobHash,
    date_posted: job.date_posted,
    job_description: job.job_description,
    status: job.status,
  }

  const { data, error } = await supabaseAdmin
    .from('jobs')
    .insert(normalizedJob)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
