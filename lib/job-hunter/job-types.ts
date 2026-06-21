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

export type JobSource = {
  id: string
  company: string
  ats_platform: string
  careers_url: string
  enabled: boolean
  crawl_interval_minutes: number
  last_crawled_at: string | null
  last_success_at: string | null
  last_job_found_at: string | null
  source_status: string
  failure_count: number
  crawler_config: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}
