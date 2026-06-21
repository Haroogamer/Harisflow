export type JobHunterJobStatus = 'new' | 'saved' | 'applied' | 'dismissed'

export type JobHunterJob = {
  id: string
  company: string
  ats_platform: string
  title: string
  location: string
  job_url: string
  job_hash: string
  date_discovered: string
  date_posted: string | null
  status: JobHunterJobStatus
  job_description: string | null
}
